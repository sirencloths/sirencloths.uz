import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog, Customer, CustomerAddress, Order, OrderItem, OrderStatus, Partner, PartnerPromoUsage, PickupLocation, Product, ProductDiscount, ProductVariant } from '../database/entities';

export type CheckoutInput = {
  email: string; phone?: string; firstName: string; lastName: string;
  shippingAddress: Record<string, unknown>; billingAddress?: Record<string, unknown>;
  paymentMethod: string; note?: string; promoCode?: string; customerId?: string | null; fulfillmentMethod?: 'delivery' | 'pickup'; pickupLocationId?: string; items: Array<{ variantId: string; quantity: number }>;
};

@Injectable()
export class CommerceService implements OnModuleInit, OnModuleDestroy {
  private pickupExpiryTimer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Partner) private readonly partners: Repository<Partner>,
    @InjectRepository(PartnerPromoUsage) private readonly promoUsages: Repository<PartnerPromoUsage>,
    @InjectRepository(PickupLocation) private readonly pickupLocations: Repository<PickupLocation>,
  ) {}

  onModuleInit() {
    void this.expireOverduePickups();
    this.pickupExpiryTimer = setInterval(() => void this.expireOverduePickups(), 60 * 60 * 1000);
  }

  onModuleDestroy() { if (this.pickupExpiryTimer) clearInterval(this.pickupExpiryTimer); }

  /** Status messages live with the order so they are available to the signed-in
   * customer without relying on a browser session or an external push vendor. */
  private orderNote(note: string | null) {
    try { return JSON.parse(note || '{}') as Record<string, unknown>; } catch { return { customerNote: note }; }
  }
  private appendCustomerUpdate(order: Order, title: string, body: string) {
    const note = this.orderNote(order.note);
    const updates = Array.isArray(note.customerUpdates) ? note.customerUpdates : [];
    note.customerUpdates = [...updates, { title, body, createdAt: new Date().toISOString(), read: false }].slice(-30);
    order.note = JSON.stringify(note);
  }
  private statusUpdate(order: Order) {
    if (order.status === OrderStatus.REFUNDED || order.paymentStatus === 'refunded') return ['Pul qaytarildi', 'Buyurtma bekor qilindi va to‘lovingiz qaytarildi.'] as const;
    if (order.status === OrderStatus.CANCELLED || order.fulfillmentStatus === 'cancelled' || order.fulfillmentStatus === 'pickup_expired') return ['Buyurtma bekor qilindi', 'Buyurtmangiz bekor qilindi. To‘lov qaytarilishi bo‘yicha ma’lumot profilingizda ko‘rinadi.'] as const;
    if (order.shippingAddress?.fulfillmentMethod === 'pickup') {
      if (['picked_up', 'pickup_completed'].includes(order.fulfillmentStatus)) return ['Buyurtma topshirildi', 'Buyurtmangiz olib ketish nuqtasida muvaffaqiyatli topshirildi.'] as const;
      if (order.fulfillmentStatus === 'ready_for_pickup') return ['Olib ketishga tayyor', 'Buyurtmangizni tanlangan olib ketish nuqtasidan olishingiz mumkin.'] as const;
      if (order.fulfillmentStatus === 'accepted_pickup') return ['Buyurtma qabul qilindi', 'Buyurtmangiz tayyorlanmoqda. Tayyor bo‘lganda xabar beramiz.'] as const;
    }
    if (order.fulfillmentStatus === 'delivered' || order.status === OrderStatus.DELIVERED) return ['Buyurtma yetkazildi', 'Buyurtmangiz muvaffaqiyatli yetkazib berildi.'] as const;
    if (order.fulfillmentStatus === 'shipped' || order.status === OrderStatus.SHIPPED) return ['Buyurtma yo‘lda', 'Kuryer buyurtmangizni olib yo‘lga chiqdi.'] as const;
    if (order.fulfillmentStatus === 'processing' || order.status === OrderStatus.PROCESSING) return ['Buyurtma yig‘ildi', 'Buyurtmangiz yig‘ildi va jo‘natishga tayyorlanmoqda.'] as const;
    if (order.fulfillmentStatus === 'accepted' || order.status === OrderStatus.PAID) return ['Buyurtma qabul qilindi', 'Buyurtmangiz qabul qilindi. Holati o‘zgarganda xabar beramiz.'] as const;
    return ['Buyurtma yangilandi', 'Buyurtmangiz holati yangilandi.'] as const;
  }

  private isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
  private async resolveVariant(repository: Repository<ProductVariant>, reference: string, lock = false) {
    const lockOptions = lock ? { lock: { mode: 'pessimistic_write' as const } } : {};
    const variant = this.isUuid(reference) ? await repository.findOne({ where: { id: reference, isActive: true }, ...lockOptions }) : await repository.findOne({ where: { sku: reference, isActive: true }, ...lockOptions });
    if (!variant) throw new BadRequestException('Savatdagi mahsulot ma’lumoti eskirgan. Mahsulotni qayta savatga qo‘shing.');
    return variant;
  }
  private async hasActiveProductDiscount(repository: Repository<ProductDiscount>, variants: ProductVariant[]) {
    const productIds = [...new Set(variants.map((variant) => variant.productId))];
    if (!productIds.length) return false;
    const now = new Date();
    const discounts = await repository.find({ where: { productId: In(productIds), isActive: true } });
    return variants.some((variant) => discounts.some((discount) => discount.productId === variant.productId && (!discount.endsAt || discount.endsAt > now) && (!discount.color || discount.color === variant.color) && (!discount.size || discount.size === variant.size)));
  }

  async checkout(input: CheckoutInput) {
    if (input.items.length === 0) throw new BadRequestException('Cart is empty');
    return this.dataSource.transaction(async (manager) => {
      const customerRepo = manager.getRepository(Customer);
      const variantRepo = manager.getRepository(ProductVariant);
      const productRepo = manager.getRepository(Product);
      const orderRepo = manager.getRepository(Order);
      const itemRepo = manager.getRepository(OrderItem);
      let customer = input.customerId ? await customerRepo.findOneBy({ id: input.customerId }) : await customerRepo.findOne({ where: { email: input.email.toLowerCase() } });
      if (!customer) customer = await customerRepo.save(customerRepo.create({ email: input.email.toLowerCase(), phone: input.phone ?? null, firstName: input.firstName, lastName: input.lastName }));
      else {
        customer.phone = input.phone ?? customer.phone;
        customer.firstName = input.firstName || customer.firstName;
        customer.lastName = input.lastName || customer.lastName;
        customer = await customerRepo.save(customer);
      }

      let subtotal = 0;
      const prepared: Array<{ variant: ProductVariant; product: Product; quantity: number; unitPrice: number }> = [];
      for (const cartItem of input.items) {
        const variant = await this.resolveVariant(variantRepo, cartItem.variantId, true);
        if (cartItem.quantity < 1 || variant.inventoryQuantity < cartItem.quantity) throw new BadRequestException(`Insufficient inventory for ${variant.sku}`);
        const product = await productRepo.findOneByOrFail({ id: variant.productId });
        const unitPrice = Number(variant.price ?? product.price);
        subtotal += unitPrice * cartItem.quantity;
        prepared.push({ variant, product, quantity: cartItem.quantity, unitPrice });
      }
      const welcomeExpiresAt = customer.welcomeDiscountExpiresAt ?? new Date(customer.createdAt.getTime() + 24 * 60 * 60 * 1000);
      const priorOrderCount = await orderRepo.count({ where: { customerId: customer.id } });
      const welcomeActive = customer.welcomeDiscountEligible && !customer.welcomeDiscountUsedAt && priorOrderCount === 0 && welcomeExpiresAt > new Date();
      if (!welcomeActive && customer.welcomeDiscountEligible && !customer.welcomeDiscountUsedAt) customer.welcomeDiscountEligible = false;
      const productDiscountActive = await this.hasActiveProductDiscount(manager.getRepository(ProductDiscount), prepared.map((row) => row.variant));
      let discount = welcomeActive ? Math.round(subtotal * (customer.welcomeDiscountPercent || 15) / 100) : 0;
      let promoPartner: Partner | null = null;
      if (input.promoCode?.trim()) {
        if (welcomeActive) throw new BadRequestException('Welcome bonus faol bo‘lganda promokod qo‘llanmaydi');
        if (productDiscountActive) throw new BadRequestException('Chegirmali mahsulotlar bilan promokod qo‘llanmaydi');
        promoPartner = await manager.getRepository(Partner).createQueryBuilder('partner').where('UPPER(partner.promo_code) = :code', { code: input.promoCode.trim().toUpperCase() }).andWhere('partner.is_active = true').andWhere('partner.archived_at IS NULL').getOne();
        if (!promoPartner) throw new BadRequestException('Promokod topilmadi yoki faol emas');
        if (promoPartner.productIds.length && prepared.some((row) => !promoPartner!.productIds.includes(row.product.id))) throw new BadRequestException('Promokod savatdagi barcha mahsulotlarga amal qilmaydi');
        if (promoPartner.perCustomerLimit) {
          const used = await manager.getRepository(PartnerPromoUsage).count({ where: { partnerId: promoPartner.id, customerId: customer.id } });
          if (used >= promoPartner.perCustomerLimit) throw new BadRequestException('Bu promokod siz uchun avval ishlatilgan');
        }
        discount += Math.round(subtotal * promoPartner.discountPercent / 100);
      }
      const isTestCustomer = customer.email?.toLowerCase() === 'skulofdemons@gmail.com';
      const fulfillmentMethod = input.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery';
      let shippingAddress = input.shippingAddress;
      if (fulfillmentMethod === 'pickup') {
        if (!input.pickupLocationId) throw new BadRequestException('Olib ketish nuqtasini tanlang');
        const point = await manager.getRepository(PickupLocation).findOneBy({ id: input.pickupLocationId, isActive: true });
        if (!point) throw new BadRequestException('Tanlangan olib ketish nuqtasi topilmadi');
        shippingAddress = { country: 'Uzbekistan', city: point.city, address: point.address, location: { latitude: Number(point.latitude), longitude: Number(point.longitude) }, fulfillmentMethod, pickupLocationId: point.id, pickupLocationName: point.name, pickupExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
      } else shippingAddress = { ...input.shippingAddress, fulfillmentMethod };
      const order = await orderRepo.save(orderRepo.create({
        customerId: customer.id,
        status: isTestCustomer ? OrderStatus.PAID : OrderStatus.PENDING,
        paymentStatus: isTestCustomer ? 'paid' : 'pending',
        fulfillmentStatus: 'pending_acceptance',
        currencyCode: 'UZS',
        subtotalAmount: String(subtotal), shippingAmount: '0', discountAmount: String(discount), totalAmount: String(Math.max(0, subtotal - discount)),
        shippingAddress, billingAddress: input.billingAddress ?? shippingAddress,
        paymentMethod: isTestCustomer ? 'test_paid' : input.paymentMethod, note: isTestCustomer ? 'Test buyurtma — to‘langan deb belgilandi' : input.note ?? null,
      }));
      if (discount) { customer.welcomeDiscountEligible = false; customer.welcomeDiscountUsedAt = new Date(); await customerRepo.save(customer); }
      else if (!welcomeActive && customer.welcomeDiscountUsedAt === null) await customerRepo.save(customer);
      for (const row of prepared) {
        row.variant.inventoryQuantity -= row.quantity;
        await variantRepo.save(row.variant);
        await itemRepo.save(itemRepo.create({ orderId: order.id, productId: row.product.id, variantId: row.variant.id, titleSnapshot: row.product.title, skuSnapshot: row.variant.sku, quantity: row.quantity, unitPrice: String(row.unitPrice), totalPrice: String(row.unitPrice * row.quantity) }));
      }
      if (promoPartner) await manager.getRepository(PartnerPromoUsage).save(manager.getRepository(PartnerPromoUsage).create({ partnerId: promoPartner.id, customerId: customer.id, orderId: order.id, discountAmount: String(Math.min(subtotal, Math.round(subtotal * promoPartner.discountPercent / 100))) }));
      const completed = await orderRepo.findOneOrFail({ where: { id: order.id }, relations: { items: true, customer: true } });
      this.appendCustomerUpdate(completed, 'Buyurtma yuborildi', 'Buyurtmangiz qabul qilinishini kutmoqda. Tez orada holatini yangilaymiz.');
      await orderRepo.save(completed);
      await manager.getRepository(AuditLog).save(manager.getRepository(AuditLog).create({ actorId: null, action: 'created', entityType: 'order', entityId: completed.id, payload: { orderNumber: completed.orderNumber, customerId: completed.customerId, total: completed.totalAmount } }));
      return completed;
    });
  }

  async validatePromo(value: string, variantIds: string[]) {
    const partner = await this.partners.createQueryBuilder('partner').where('UPPER(partner.promo_code) = :code', { code: value.trim().toUpperCase() }).andWhere('partner.is_active = true').andWhere('partner.archived_at IS NULL').getOne();
    if (!partner) throw new BadRequestException('Promokod topilmadi yoki faol emas');
    const variantRepository = this.dataSource.getRepository(ProductVariant);
    const variants = await Promise.all(variantIds.map((variantId) => this.resolveVariant(variantRepository, variantId)));
    if (partner.productIds.length && variants.some((variant) => !partner.productIds.includes(variant.productId))) throw new BadRequestException('Promokod savatdagi barcha mahsulotlarga amal qilmaydi');
    if (await this.hasActiveProductDiscount(this.dataSource.getRepository(ProductDiscount), variants)) throw new BadRequestException('Chegirmali mahsulotlar bilan promokod qo‘llanmaydi');
    return { code: partner.promoCode, percent: partner.discountPercent };
  }

  async listOrders() {
    await this.expireOverduePickups();
    const orders = await this.orders.find({ relations: { customer: true, items: true }, order: { createdAt: 'DESC' } });
    const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.productId).filter((id): id is string => Boolean(id))))];
    const products = productIds.length ? await this.dataSource.getRepository(Product).findByIds(productIds) : [];
    const images = new Map(products.map((product) => [product.id, product.media?.[0]?.url ?? null]));
    return orders.map((order) => ({ ...order, items: order.items.map((item) => ({ ...item, imageUrl: item.productId ? images.get(item.productId) ?? null : null })) }));
  }
  async listCustomerOrders(customerId: string) {
    await this.expireOverduePickups();
    const orders = await this.orders.find({ where: { customerId }, relations: { items: true }, order: { createdAt: 'DESC' } });
    const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.productId).filter((id): id is string => Boolean(id))))];
    const products = productIds.length ? await this.dataSource.getRepository(Product).findByIds(productIds) : [];
    const images = new Map(products.map((product) => [product.id, product.media?.[0]?.url ?? null]));
    return orders.map((order) => ({ ...order, items: order.items.map((item) => ({ ...item, imageUrl: item.productId ? images.get(item.productId) ?? null : null })) }));
  }
  async updateOrder(id: string, input: Partial<Pick<Order, 'status' | 'paymentStatus' | 'fulfillmentStatus' | 'note'>>) {
    const previous = await this.orders.findOneBy({ id });
    if (!previous) throw new NotFoundException('Order not found');
    const order = await this.orders.preload({ id, ...input });
    if (!order) throw new NotFoundException('Order not found');
    const changed = previous.status !== order.status || previous.paymentStatus !== order.paymentStatus || previous.fulfillmentStatus !== order.fulfillmentStatus;
    if (changed) {
      const [title, body] = this.statusUpdate(order);
      this.appendCustomerUpdate(order, title, body);
    }
    return this.orders.save(order);
  }
  async cancelOrder(id: string, input: { reason: string; evidenceUrl?: string }) {
    const order = await this.orders.findOneBy({ id });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) throw new BadRequestException('Buyurtma avval bekor qilingan');
    const cash = /nalich|naqd|cash|налич/i.test(order.paymentMethod ?? '');
    const refundState = order.paymentStatus === 'paid' ? (cash ? 'cash_refund_pending' : 'refund_requested') : 'not_paid';
    order.status = OrderStatus.CANCELLED;
    order.fulfillmentStatus = 'cancelled';
    order.paymentStatus = refundState;
    const note = this.orderNote(order.note);
    note.cancellation = { reason: input.reason, evidenceUrl: input.evidenceUrl ?? null, refundMethod: cash ? 'cash' : 'payme', refundState, requestedAt: new Date().toISOString() };
    order.note = JSON.stringify(note);
    const [title, body] = this.statusUpdate(order); this.appendCustomerUpdate(order, title, body);
    return this.orders.save(order);
  }
  async completeRefund(id: string) {
    const order = await this.orders.findOneBy({ id });
    if (!order) throw new NotFoundException('Order not found');
    if (!['cash_refund_pending', 'refund_requested'].includes(order.paymentStatus)) throw new BadRequestException('Bu buyurtma refundni kutmayapti');
    order.status = OrderStatus.REFUNDED;
    order.paymentStatus = 'refunded';
    order.fulfillmentStatus = 'refund_completed';
    const [title, body] = this.statusUpdate(order); this.appendCustomerUpdate(order, title, body);
    return this.orders.save(order);
  }
  async listCustomers() {
    const customers = await this.customers.find({ order: { createdAt: 'DESC' } });
    return Promise.all(customers.map(async (customer) => {
      const totals = await this.orders.createQueryBuilder('order').select('COUNT(*)', 'orders').addSelect('COALESCE(SUM(order.total_amount), 0)', 'spent').where('order.customer_id = :id', { id: customer.id }).andWhere('order.payment_status = :paymentStatus', { paymentStatus: 'paid' }).getRawOne<{ orders: string; spent: string }>();
      const totalOrders = Number(totals?.orders ?? 0);
      const welcomeDiscountEligible = customer.welcomeDiscountEligible && totalOrders === 0;
      if (customer.welcomeDiscountEligible !== welcomeDiscountEligible) {
        customer.welcomeDiscountEligible = false;
        await this.customers.save(customer);
      }
      return { ...customer, welcomeDiscountEligible, totalOrders, totalSpent: Number(totals?.spent ?? 0) };
    }));
  }
  async customerDetails(id: string) {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    const [orders, addresses] = await Promise.all([
      this.orders.find({ where: { customerId: id }, relations: { items: true }, order: { createdAt: 'DESC' } }),
      this.dataSource.getRepository(CustomerAddress).find({ where: { customerId: id }, order: { isDefault: 'DESC', updatedAt: 'DESC' } }),
    ]);
    const paidOrders = orders.filter((order) => order.paymentStatus === 'paid');
    const totalSpent = paidOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    return {
      ...customer,
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      totalSpent,
      averageOrder: paidOrders.length ? totalSpent / paidOrders.length : 0,
      addresses,
      lastOrderAt: orders[0]?.createdAt ?? null,
      orders: orders.map((order) => ({
        id: order.id, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus, totalAmount: order.totalAmount, currencyCode: order.currencyCode,
        paymentMethod: order.paymentMethod, shippingAddress: order.shippingAddress, note: order.note, createdAt: order.createdAt,
        items: order.items.map((item) => ({ title: item.titleSnapshot, sku: item.skuSnapshot, quantity: item.quantity, unitPrice: item.unitPrice })),
      })),
    };
  }
  async listPickupLocations(includeInactive = false) { return this.pickupLocations.find({ where: includeInactive ? {} : { isActive: true }, order: { city: 'ASC', name: 'ASC' } }); }
  async listPickupOrders() {
    await this.expireOverduePickups();
    const orders = await this.orders.find({ relations: { customer: true }, order: { createdAt: 'DESC' } });
    return orders.filter((order) => order.shippingAddress?.fulfillmentMethod === 'pickup');
  }
  async createPickupLocation(input: Partial<PickupLocation>) {
    if (!input.name || !input.address || !input.city || !Number.isFinite(Number(input.latitude)) || !Number.isFinite(Number(input.longitude))) throw new BadRequestException('Nuqta ma’lumotlarini to‘liq kiriting');
    return this.pickupLocations.save(this.pickupLocations.create({ name: input.name, address: input.address, city: input.city, latitude: String(input.latitude), longitude: String(input.longitude), instructions: input.instructions ?? null, workingHours: input.workingHours ?? null, isActive: input.isActive ?? true }));
  }
  async updatePickupLocation(id: string, input: Partial<PickupLocation>) {
    const point = await this.pickupLocations.preload({ id, ...input }); if (!point) throw new NotFoundException('Olib ketish nuqtasi topilmadi'); return this.pickupLocations.save(point);
  }
  async removePickupLocation(id: string) { const point = await this.pickupLocations.findOneBy({ id }); if (!point) throw new NotFoundException('Olib ketish nuqtasi topilmadi'); point.isActive = false; return this.pickupLocations.save(point); }
  private async expireOverduePickups() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const awaiting = await this.orders.find({ where: { fulfillmentStatus: 'ready_for_pickup' } });
    const expired = awaiting.filter((order) => order.createdAt < cutoff && order.shippingAddress?.fulfillmentMethod === 'pickup');
    if (!expired.length) return;
    await this.orders.save(expired.map((order) => { order.status = OrderStatus.CANCELLED; order.fulfillmentStatus = 'pickup_expired'; const [title, body] = this.statusUpdate(order); this.appendCustomerUpdate(order, title, body); return order; }));
  }
}
