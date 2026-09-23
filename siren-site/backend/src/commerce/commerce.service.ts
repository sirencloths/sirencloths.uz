import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog, Customer, CustomerAddress, Order, OrderItem, OrderStatus, Partner, PartnerPromoUsage, PickupLocation, Product, ProductDiscount, ProductVariant } from '../database/entities';
import { TelegramService } from '../telegram/telegram.service';

export type CheckoutInput = {
  email: string; phone?: string; firstName: string; lastName: string;
  shippingAddress: Record<string, unknown>; billingAddress?: Record<string, unknown>;
  paymentMethod: string; note?: string; promoCode?: string; customerId?: string | null; fulfillmentMethod?: 'delivery' | 'pickup'; pickupLocationId?: string; items: Array<{ variantId: string; quantity: number }>;
};
const customerNotificationCopy = (title: string, fallback: string) => {
  const value = title.toLowerCase();
  if (value.includes('yuborildi')) return { uz: ['Buyurtma berildi', 'Buyurtmangiz qabul qilinishini kutmoqda.'], ru: ['Заказ оформлен', 'Ожидает подтверждения.'], en: ['Order placed', 'Awaiting confirmation.'] };
  if (value.includes('qabul qilindi')) return { uz: ['Buyurtma qabul qilindi', 'Buyurtmangiz tayyorlanmoqda.'], ru: ['Заказ принят', 'Заказ готовится.'], en: ['Order accepted', 'Your order is being prepared.'] };
  if (value.includes('yig‘ildi') || value.includes("yig'ildi")) return { uz: ['Buyurtma yig‘ildi', 'Jo‘natishga tayyorlanmoqda.'], ru: ['Заказ собран', 'Готовится к отправке.'], en: ['Order packed', 'Preparing for shipment.'] };
  if (value.includes('yo‘lda') || value.includes("yo'lda")) return { uz: ['Buyurtma yo‘lda', 'Kuryer buyurtmani olib ketdi.'], ru: ['Заказ в пути', 'Курьер забрал заказ.'], en: ['Order on the way', 'The courier has your order.'] };
  if (value.includes('yetkazildi')) return { uz: ['Buyurtma yetkazildi', 'Buyurtma topshirildi.'], ru: ['Заказ доставлен', 'Заказ передан вам.'], en: ['Order delivered', 'Your order has been delivered.'] };
  if (value.includes('topshirildi')) return { uz: ['Buyurtma topshirildi', 'Buyurtma qabul qilindi.'], ru: ['Заказ выдан', 'Заказ получен.'], en: ['Order handed over', 'Your order was collected.'] };
  if (value.includes('tayyor')) return { uz: ['Olib ketishga tayyor', 'Nuqtadan olib ketishingiz mumkin.'], ru: ['Готов к выдаче', 'Можно забрать в пункте выдачи.'], en: ['Ready for pickup', 'Collect it from the pickup point.'] };
  if (value.includes('bekor qilindi')) return { uz: ['Buyurtma bekor qilindi', 'Buyurtma bekor qilindi.'], ru: ['Заказ отменён', 'Заказ отменён.'], en: ['Order cancelled', 'Your order was cancelled.'] };
  if (value.includes('pul qaytarildi')) return { uz: ['Pul qaytarildi', 'Mablag‘ qaytarildi.'], ru: ['Деньги возвращены', 'Возврат выполнен.'], en: ['Refund completed', 'Your payment was refunded.'] };
  return { uz: [title, fallback], ru: [title, fallback], en: [title, fallback] };
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
    private readonly telegram: TelegramService,
  ) {}

  private async notifyOrder(id: string, kind: 'created' | 'status') {
    const order = await this.orders.findOne({ where: { id }, relations: { customer: true, items: true } });
    if (!order) return;
    if (kind === 'created') void this.telegram.orderCreated(order);
    else void this.telegram.orderStatusChanged(order);
  }

  private paymeConfig() {
    const merchantId = process.env.PAYME_MERCHANT_ID?.trim();
    const key = process.env.PAYME_KEY?.trim();
    if (!merchantId || !key) throw new BadRequestException('Payme hali sozlanmagan. PAYME_MERCHANT_ID va PAYME_KEY ni kiriting.');
    const testMode = process.env.PAYME_TEST_MODE === 'true';
    return {
      merchantId,
      key,
      checkoutUrl: process.env.PAYME_CHECKOUT_URL?.replace(/\/$/, '') || (testMode ? 'https://test.paycom.uz' : 'https://checkout.paycom.uz'),
      returnUrl: process.env.PAYME_RETURN_URL?.trim() || `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/profile`,
    };
  }

  paymeAdminStatus() {
    const merchantConfigured = Boolean(process.env.PAYME_MERCHANT_ID?.trim());
    const keyConfigured = Boolean(process.env.PAYME_KEY?.trim());
    const publicApi = (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');
    return {
      configured: merchantConfigured && keyConfigured,
      merchantConfigured,
      keyConfigured,
      mode: process.env.PAYME_TEST_MODE === 'true' ? 'test' : 'production',
      callbackUrl: `${publicApi}/api/checkout/payme/merchant`,
      returnUrl: process.env.PAYME_RETURN_URL?.trim() || `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/profile`,
    };
  }

  private ensurePaymeAuthorization(authorization?: string) {
    const { key } = this.paymeConfig();
    const expected = `Basic ${Buffer.from(`Paycom:${key}`).toString('base64')}`;
    return authorization === expected;
  }

  private paymeError(code: number, message: string, data?: string) {
    return { error: { code, message: { ru: message, uz: message, en: message }, data: data ?? null } };
  }

  private paymeRecord(order: Order) {
    const note = this.orderNote(order.note);
    return { note, payme: (note.payme && typeof note.payme === 'object' ? note.payme : {}) as Record<string, unknown> };
  }

  async createPaymeCheckout(orderId: string) {
    const order = await this.orders.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (order.paymentMethod !== 'payme') throw new BadRequestException('Bu buyurtma Payme orqali to‘lanmaydi');
    if (order.paymentStatus === 'paid') throw new BadRequestException('Bu buyurtma avval to‘langan');
    if ([OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status)) throw new BadRequestException('Bekor qilingan buyurtma uchun to‘lov ochib bo‘lmaydi');
    const config = this.paymeConfig();
    const amount = Math.round(Number(order.totalAmount) * 100);
    const returnUrl = `${config.returnUrl}${config.returnUrl.includes('?') ? '&' : '?'}payme_order=${encodeURIComponent(order.id)}`;
    const payload = `m=${config.merchantId};ac.order_id=${order.id};a=${amount};l=ru;c=${encodeURIComponent(returnUrl)}`;
    return { url: `${config.checkoutUrl}/${Buffer.from(payload).toString('base64')}`, orderId: order.id, amount };
  }

  async handlePaymeMerchant(payload: Record<string, unknown>, authorization?: string) {
    const id = payload.id ?? null;
    if (!this.ensurePaymeAuthorization(authorization)) return { jsonrpc: '2.0', id, ...this.paymeError(-32504, 'Unauthorized') };
    const method = String(payload.method || '');
    const params = (payload.params && typeof payload.params === 'object' ? payload.params : {}) as Record<string, unknown>;
    try {
      let result: Record<string, unknown>;
      if (method === 'CheckPerformTransaction') result = await this.paymeCheck(params);
      else if (method === 'CreateTransaction') result = await this.paymeCreate(params);
      else if (method === 'PerformTransaction') result = await this.paymePerform(params);
      else if (method === 'CancelTransaction') result = await this.paymeCancel(params);
      else if (method === 'CheckTransaction') result = await this.paymeCheckTransaction(params);
      else if (method === 'GetStatement') result = { transactions: [] };
      else return { jsonrpc: '2.0', id, ...this.paymeError(-32601, 'Method not found') };
      return { jsonrpc: '2.0', id, result };
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Payment processing error';
      return { jsonrpc: '2.0', id, ...this.paymeError(-31050, message) };
    }
  }

  private async paymeOrder(params: Record<string, unknown>) {
    const account = (params.account && typeof params.account === 'object' ? params.account : {}) as Record<string, unknown>;
    const orderId = String(account.order_id || '');
    const order = await this.orders.findOneBy({ id: orderId });
    if (!order || order.paymentMethod !== 'payme') throw new BadRequestException('Buyurtma topilmadi');
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount !== Math.round(Number(order.totalAmount) * 100)) throw new BadRequestException('To‘lov summasi buyurtmaga mos emas');
    return order;
  }

  private async paymeCheck(params: Record<string, unknown>) {
    const order = await this.paymeOrder(params);
    if ([OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status)) throw new BadRequestException('Buyurtma bekor qilingan');
    return { allow: order.paymentStatus !== 'paid' };
  }

  private async paymeCreate(params: Record<string, unknown>) {
    const order = await this.paymeOrder(params);
    const transactionId = String(params.id || '');
    const time = Number(params.time) || Date.now();
    if (!transactionId) throw new BadRequestException('Transaction ID talab qilinadi');
    const { note, payme } = this.paymeRecord(order);
    if (payme.transactionId && payme.transactionId !== transactionId) throw new BadRequestException('Buyurtmada boshqa tranzaksiya mavjud');
    payme.transactionId = transactionId; payme.createTime = Number(payme.createTime) || time; payme.state = order.paymentStatus === 'paid' ? 2 : 1;
    note.payme = payme; order.note = JSON.stringify(note); await this.orders.save(order);
    return { create_time: payme.createTime, transaction: transactionId, state: payme.state, receivers: null };
  }

  private async paymeTransaction(params: Record<string, unknown>) {
    const transactionId = String(params.id || '');
    const orders = await this.orders.find({ where: { paymentMethod: 'payme' } });
    const order = orders.find((candidate) => this.paymeRecord(candidate).payme.transactionId === transactionId);
    if (!order) throw new BadRequestException('Tranzaksiya topilmadi');
    return { order, transactionId };
  }

  private async paymePerform(params: Record<string, unknown>) {
    const { order, transactionId } = await this.paymeTransaction(params);
    const { note, payme } = this.paymeRecord(order);
    if (order.paymentStatus !== 'paid') {
      order.status = OrderStatus.PAID; order.paymentStatus = 'paid'; order.fulfillmentStatus = order.shippingAddress?.fulfillmentMethod === 'pickup' ? 'accepted_pickup' : 'accepted';
      payme.performTime = Date.now(); payme.state = 2; note.payme = payme; order.note = JSON.stringify(note);
      const [title, body] = this.statusUpdate(order); this.appendCustomerUpdate(order, title, body);
      await this.orders.save(order);
      void this.notifyOrder(order.id, 'status');
    }
    return { transaction: transactionId, perform_time: Number(payme.performTime) || Date.now(), state: 2 };
  }

  private async releasePaymeReservation(orderId: string) {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.getRepository(Order).findOne({ where: { id: orderId }, relations: { items: true }, lock: { mode: 'pessimistic_write' } });
      if (!order) return;
      const { note, payme } = this.paymeRecord(order);
      if (payme.inventoryReleased === true) return;
      const variantRepo = manager.getRepository(ProductVariant);
      for (const item of order.items) {
        if (!item.variantId) continue;
        const variant = await variantRepo.findOne({ where: { id: item.variantId }, lock: { mode: 'pessimistic_write' } });
        if (!variant) continue;
        variant.inventoryQuantity += item.quantity;
        await variantRepo.save(variant);
      }
      payme.inventoryReleased = true; note.payme = payme; order.note = JSON.stringify(note);
      await manager.getRepository(Order).save(order);
    });
  }

  private async paymeCancel(params: Record<string, unknown>) {
    const { order, transactionId } = await this.paymeTransaction(params);
    const { note, payme } = this.paymeRecord(order);
    const wasPaid = order.paymentStatus === 'paid';
    order.status = wasPaid ? OrderStatus.REFUNDED : OrderStatus.CANCELLED;
    order.paymentStatus = wasPaid ? 'refunded' : 'cancelled'; order.fulfillmentStatus = 'cancelled';
    payme.cancelTime = Date.now(); payme.state = wasPaid ? -2 : -1; note.payme = payme;
    if (wasPaid) note.cancellation = { ...(note.cancellation as Record<string, unknown> || {}), refundMethod: 'payme', refundState: 'refunded', refundActor: 'service', requestedAt: new Date().toISOString() };
    order.note = JSON.stringify(note);
    const [title, body] = this.statusUpdate(order); this.appendCustomerUpdate(order, title, body);
    await this.orders.save(order);
    void this.notifyOrder(order.id, 'status');
    await this.releasePaymeReservation(order.id);
    return { transaction: transactionId, cancel_time: payme.cancelTime, state: payme.state };
  }

  private async paymeCheckTransaction(params: Record<string, unknown>) {
    const { order, transactionId } = await this.paymeTransaction(params);
    const { payme } = this.paymeRecord(order);
    return { create_time: Number(payme.createTime) || 0, perform_time: Number(payme.performTime) || 0, cancel_time: Number(payme.cancelTime) || 0, transaction: transactionId, state: Number(payme.state) || 1, reason: null };
  }

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
    if (order.status === OrderStatus.CANCELLED || order.fulfillmentStatus === 'cancelled' || order.fulfillmentStatus === 'pickup_expired') return ['Buyurtma bekor qilindi', order.paymentStatus === 'not_paid' || order.paymentStatus === 'cancelled' ? 'Buyurtmangiz bekor qilindi.' : 'Buyurtmangiz bekor qilindi. To‘lov qaytarilishi bo‘yicha ma’lumot profilingizda ko‘rinadi.'] as const;
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
    if (input.paymentMethod === 'payme' && input.email.toLowerCase() !== 'skulofdemons@gmail.com') this.paymeConfig();
    const completed = await this.dataSource.transaction(async (manager) => {
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
    void this.notifyOrder(completed.id, 'created');
    return completed;
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
  async listCustomerNotifications(customerId: string) {
    const orders = await this.listCustomerOrders(customerId);
    return orders.flatMap((order) => {
      const note = this.orderNote(order.note); const updates = Array.isArray(note.customerUpdates) ? note.customerUpdates : [];
      const imageUrl = order.items[0]?.imageUrl ?? null;
      return updates.filter((update): update is { title: string; body: string; createdAt: string } => Boolean(update && typeof update === 'object' && typeof (update as { title?: unknown }).title === 'string' && typeof (update as { body?: unknown }).body === 'string' && typeof (update as { createdAt?: unknown }).createdAt === 'string')).map((update) => {
        const copy = customerNotificationCopy(update.title, update.body);
        return { id: `order-${order.id}-${update.createdAt}`, kind: 'order', title: { uz: copy.uz[0], ru: copy.ru[0], en: copy.en[0] }, text: { uz: copy.uz[1], ru: copy.ru[1], en: copy.en[1] }, imageUrl, href: `/profile/orders`, createdAt: update.createdAt };
      });
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
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
    const saved = await this.orders.save(order);
    const paymentChanged = previous.paymentStatus !== saved.paymentStatus && ['paid', 'refunded'].includes(saved.paymentStatus);
    const customerReceived = previous.fulfillmentStatus !== saved.fulfillmentStatus && ['picked_up', 'delivered', 'handed_over'].includes(saved.fulfillmentStatus);
    if (paymentChanged || customerReceived) void this.notifyOrder(saved.id, 'status');
    return saved;
  }
  async createShipmentRequest(id: string, input: { provider: string; senderName: string; senderPhone: string; weightKg: string; packageCount: string; comment?: string }) {
    const order = await this.orders.findOneBy({ id });
    if (!order) throw new NotFoundException('Order not found');
    if (order.shippingAddress?.fulfillmentMethod === 'pickup') throw new BadRequestException('Olib ketish buyurtmasi uchun jo‘natma yaratilmaydi');
    if ([OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status)) throw new BadRequestException('Bekor qilingan buyurtma uchun jo‘natma yaratib bo‘lmaydi');
    const note = this.orderNote(order.note);
    note.deliveryShipment = { provider: input.provider.trim(), senderName: input.senderName.trim(), senderPhone: input.senderPhone.trim(), weightKg: input.weightKg.trim(), packageCount: input.packageCount.trim(), comment: input.comment?.trim() || null, submittedAt: new Date().toISOString(), syncStatus: 'awaiting_partner_api' };
    order.note = JSON.stringify(note);
    return this.orders.save(order);
  }
  async cancelOrder(id: string, input: { reason?: string; evidenceUrl?: string; refundActor?: 'customer' | 'operator' | 'service' }) {
    const order = await this.orders.findOneBy({ id });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.REFUNDED) throw new BadRequestException('Buyurtma avval bekor qilingan');
    const cash = /nalich|naqd|cash|налич/i.test(order.paymentMethod ?? '');
    const refundState = order.paymentStatus === 'paid' ? (cash ? 'cash_refund_pending' : 'refund_requested') : 'not_paid';
    order.status = OrderStatus.CANCELLED;
    order.fulfillmentStatus = 'cancelled';
    order.paymentStatus = refundState;
    const note = this.orderNote(order.note);
    note.cancellation = { reason: input.reason || '', evidenceUrl: input.evidenceUrl ?? null, refundMethod: cash ? 'cash' : 'payme', refundState, refundActor: input.refundActor ?? 'operator', requestedAt: new Date().toISOString() };
    order.note = JSON.stringify(note);
    const [title, body] = this.statusUpdate(order); this.appendCustomerUpdate(order, title, body);
    const saved = await this.orders.save(order);
    void this.notifyOrder(saved.id, 'status');
    return saved;
  }
  async cancelCustomerOrder(id: string, customerId: string, input: { reason?: string }) {
    const order = await this.orders.findOneBy({ id });
    if (!order || order.customerId !== customerId) throw new NotFoundException('Buyurtma topilmadi');
    return this.cancelOrder(id, { reason: input.reason, refundActor: 'customer' });
  }
  async completeRefund(id: string) {
    const order = await this.orders.findOneBy({ id });
    if (!order) throw new NotFoundException('Order not found');
    if (!['cash_refund_pending', 'refund_requested'].includes(order.paymentStatus)) throw new BadRequestException('Bu buyurtma refundni kutmayapti');
    order.status = OrderStatus.REFUNDED;
    order.paymentStatus = 'refunded';
    order.fulfillmentStatus = 'refund_completed';
    const [title, body] = this.statusUpdate(order); this.appendCustomerUpdate(order, title, body);
    const saved = await this.orders.save(order);
    void this.notifyOrder(saved.id, 'status');
    return saved;
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
