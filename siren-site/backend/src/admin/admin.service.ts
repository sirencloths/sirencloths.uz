import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditLog, Customer, Order, Product, User, UserRole } from '../database/entities';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
  ) {}
  async dashboard() {
    const [products, customers, orders, recentOrders, revenue] = await Promise.all([
      this.products.count(), this.customers.count(), this.orders.count(),
      this.orders.find({ relations: { customer: true }, order: { createdAt: 'DESC' }, take: 8 }),
      this.orders.createQueryBuilder('order').select('COALESCE(SUM(order.total_amount), 0)', 'total').where("order.payment_status = 'paid'").getRawOne<{ total: string }>(),
    ]);
    return { products, customers, orders, paidRevenue: revenue?.total ?? '0', recentOrders };
  }
  async listUsers() { return (await this.users.find({ order: { createdAt: 'DESC' } })).map(({ passwordHash: _hash, ...user }) => user); }
  async createUser(input: { email: string; password: string; firstName?: string; lastName?: string; role: UserRole }, actorId?: string) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.exists({ where: { email } })) throw new ConflictException('User already exists');
    const user = await this.users.save(this.users.create({ email, passwordHash: await bcrypt.hash(input.password, 12), firstName: input.firstName ?? '', lastName: input.lastName ?? '', role: input.role }));
    await this.audit(actorId, 'created', 'user', user.id, { email, role: user.role });
    const { passwordHash: _hash, ...safe } = user;
    return safe;
  }
  async updateUser(id: string, input: Partial<{ firstName: string; lastName: string; role: UserRole; isActive: boolean }>, actorId?: string) {
    const user = await this.users.preload({ id, ...input });
    if (!user) throw new NotFoundException('User not found');
    const saved = await this.users.save(user);
    await this.audit(actorId, 'updated', 'user', saved.id, input);
    const { passwordHash: _hash, ...safe } = saved;
    return safe;
  }
  logs() { return this.auditLogs.find({ order: { createdAt: 'DESC' }, take: 200 }); }
  audit(actorId: string | undefined, action: string, entityType: string, entityId: string | null, payload: Record<string, unknown>) { return this.auditLogs.save(this.auditLogs.create({ actorId: actorId ?? null, action, entityType, entityId, payload })); }
}
