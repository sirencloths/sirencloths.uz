import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Customer, Order, OrderItem, OrderStatus, Product, ProductVariant } from '../database/entities';

export type CheckoutInput = {
  email: string; phone?: string; firstName: string; lastName: string;
  shippingAddress: Record<string, unknown>; billingAddress?: Record<string, unknown>;
  paymentMethod: string; note?: string; customerId?: string | null; items: Array<{ variantId: string; quantity: number }>;
};

@Injectable()
export class CommerceService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
  ) {}

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
        const variant = await variantRepo.findOne({ where: { id: cartItem.variantId, isActive: true }, lock: { mode: 'pessimistic_write' } });
        if (!variant) throw new NotFoundException('Product variant not found');
        if (cartItem.quantity < 1 || variant.inventoryQuantity < cartItem.quantity) throw new BadRequestException(`Insufficient inventory for ${variant.sku}`);
        const product = await productRepo.findOneByOrFail({ id: variant.productId });
        const unitPrice = Number(variant.price ?? product.price);
        subtotal += unitPrice * cartItem.quantity;
        prepared.push({ variant, product, quantity: cartItem.quantity, unitPrice });
      }
      const discount = customer.welcomeDiscountEligible && !customer.welcomeDiscountUsedAt ? Math.round(subtotal * (customer.welcomeDiscountPercent || 15) / 100) : 0;
      const order = await orderRepo.save(orderRepo.create({
        customerId: customer.id,
        status: OrderStatus.PENDING,
        paymentStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        currencyCode: 'UZS',
        subtotalAmount: String(subtotal), shippingAmount: '0', discountAmount: String(discount), totalAmount: String(Math.max(0, subtotal - discount)),
        shippingAddress: input.shippingAddress, billingAddress: input.billingAddress ?? input.shippingAddress,
        paymentMethod: input.paymentMethod, note: input.note ?? null,
      }));
      if (discount) { customer.welcomeDiscountEligible = false; customer.welcomeDiscountUsedAt = new Date(); await customerRepo.save(customer); }
      for (const row of prepared) {
        row.variant.inventoryQuantity -= row.quantity;
        await variantRepo.save(row.variant);
        await itemRepo.save(itemRepo.create({ orderId: order.id, productId: row.product.id, variantId: row.variant.id, titleSnapshot: row.product.title, skuSnapshot: row.variant.sku, quantity: row.quantity, unitPrice: String(row.unitPrice), totalPrice: String(row.unitPrice * row.quantity) }));
      }
      return orderRepo.findOneOrFail({ where: { id: order.id }, relations: { items: true, customer: true } });
    });
  }

  listOrders() { return this.orders.find({ relations: { customer: true, items: true }, order: { createdAt: 'DESC' } }); }
  async updateOrder(id: string, input: Partial<Pick<Order, 'status' | 'paymentStatus' | 'fulfillmentStatus' | 'note'>>) {
    const order = await this.orders.preload({ id, ...input });
    if (!order) throw new NotFoundException('Order not found');
    return this.orders.save(order);
  }
  async listCustomers() {
    const customers = await this.customers.find({ order: { createdAt: 'DESC' } });
    return Promise.all(customers.map(async (customer) => {
      const totals = await this.orders.createQueryBuilder('order').select('COUNT(*)', 'orders').addSelect('COALESCE(SUM(order.total_amount), 0)', 'spent').where('order.customer_id = :id', { id: customer.id }).getRawOne<{ orders: string; spent: string }>();
      return { ...customer, totalOrders: Number(totals?.orders ?? 0), totalSpent: Number(totals?.spent ?? 0) };
    }));
  }
}
