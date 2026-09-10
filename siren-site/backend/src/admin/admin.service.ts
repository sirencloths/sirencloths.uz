import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditLog, Customer, Order, Product, SiteSetting, User, UserRole } from '../database/entities';

type DashboardPeriod = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';
type DashboardMetric = 'visitors' | 'customers' | 'orders' | 'units' | 'revenue' | 'profit';
type DashboardGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
type DashboardInput = { period?: DashboardPeriod; metric?: DashboardMetric; granularity?: DashboardGranularity; currency?: string; from?: string; to?: string };
const supportedCurrencies = ['UZS', 'USD', 'EUR', 'RUB', 'KZT'] as const;
const paidOrder = (order: Order) => order.paymentStatus === 'paid';
const numberOf = (value: string | number | null | undefined) => Number(value ?? 0) || 0;
const startOfDay = (date: Date) => { const next = new Date(date); next.setHours(0, 0, 0, 0); return next; };
const addDays = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next; };
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const inRange = (date: Date, range: { start: Date; end: Date }) => date >= range.start && date <= range.end;
const percentChange = (current: number, previous: number) => previous ? ((current - previous) / Math.abs(previous)) * 100 : null;
const periodRange = (input: DashboardInput) => {
  const now = new Date(); const end = new Date(now); let start = startOfDay(now);
  if (input.period === '7d') start = addDays(start, -6);
  if (input.period === '30d') start = addDays(start, -29);
  if (input.period === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (input.period === 'year') start = new Date(now.getFullYear(), 0, 1);
  if (input.period === 'custom' && input.from && input.to) { const from = new Date(input.from); const to = new Date(input.to); if (!Number.isNaN(from.valueOf()) && !Number.isNaN(to.valueOf())) { start = startOfDay(from); end.setTime(to.valueOf()); end.setHours(23, 59, 59, 999); } }
  return { start, end };
};
const previousRange = (range: { start: Date; end: Date }) => { const duration = range.end.valueOf() - range.start.valueOf() + 1; return { start: new Date(range.start.valueOf() - duration), end: new Date(range.start.valueOf() - 1) }; };

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>,
  ) {}

  private async rates() {
    const setting = await this.settings.findOneBy({ key: 'currency-rates' });
    const stored = setting?.value ?? {}; const raw = (stored.rates && typeof stored.rates === 'object' ? stored.rates : stored) as Record<string, unknown>;
    const rates: Record<string, number | null> = { UZS: 1, USD: null, EUR: null, RUB: null, KZT: null };
    for (const code of supportedCurrencies) { const candidate = raw[code]; const rate = numberOf(typeof candidate === 'string' || typeof candidate === 'number' ? candidate : null); if (rate > 0) rates[code] = rate; }
    return rates;
  }
  private convert(value: number, currency: string, rates: Record<string, number | null>) { const rate = rates[currency]; return rate ? value / rate : value; }
  private profit(order: Order, products: Map<string, Product>) { return (order.items ?? []).reduce((total, item) => { const product = item.productId ? products.get(item.productId) : undefined; const variant = product?.variants?.find((entry) => entry.id === item.variantId); const cost = numberOf(variant?.attributes?.costPrice as string) + numberOf(variant?.attributes?.expensePrice as string); return total + numberOf(item.totalPrice) - cost * item.quantity; }, 0); }
  private summary(orders: Order[], customers: Customer[], products: Product[], range: { start: Date; end: Date }, productMap: Map<string, Product>) {
    const valid = orders.filter((order) => paidOrder(order) && inRange(order.createdAt, range)); const revenue = valid.reduce((sum, order) => sum + numberOf(order.totalAmount), 0);
    const units = valid.reduce((sum, order) => sum + (order.items ?? []).reduce((subtotal, item) => subtotal + item.quantity, 0), 0); const profit = valid.reduce((sum, order) => sum + this.profit(order, productMap), 0);
    const parentProducts = products.filter((product) => inRange(product.createdAt, range)).length;
    return { customers: customers.filter((customer) => inRange(customer.createdAt, range)).length, revenue, products: parentProducts, baseProducts: parentProducts, units, orders: valid.length, averageOrderValue: valid.length ? revenue / valid.length : 0, profit };
  }
  private bucket(date: Date, granularity: DashboardGranularity) { if (granularity === 'yearly') return String(date.getFullYear()); if (granularity === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; if (granularity === 'weekly') return dateKey(addDays(startOfDay(date), -((date.getDay() + 6) % 7))); return dateKey(date); }
  private chart(orders: Order[], customers: Customer[], audit: AuditLog[], range: { start: Date; end: Date }, metric: DashboardMetric, granularity: DashboardGranularity, productMap: Map<string, Product>) {
    const values = new Map<string, number>(); const add = (date: Date, value: number) => { if (inRange(date, range)) { const key = this.bucket(date, granularity); values.set(key, (values.get(key) ?? 0) + value); } };
    if (metric === 'customers') customers.forEach((item) => add(item.createdAt, 1));
    else if (metric === 'visitors') audit.filter((item) => item.entityType === 'visit').forEach((item) => add(item.createdAt, 1));
    else if (metric === 'orders') orders.filter(paidOrder).forEach((item) => add(item.createdAt, 1));
    else if (metric === 'units') orders.filter(paidOrder).forEach((item) => add(item.createdAt, (item.items ?? []).reduce((sum, row) => sum + row.quantity, 0)));
    else if (metric === 'revenue') orders.filter(paidOrder).forEach((item) => add(item.createdAt, numberOf(item.totalAmount)));
    else orders.filter(paidOrder).forEach((item) => add(item.createdAt, this.profit(item, productMap)));
    return [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
  }

  async dashboard(input: DashboardInput = {}) {
    const period = input.period ?? '30d', metric = input.metric ?? 'revenue', granularity = input.granularity ?? 'daily';
    const currency = supportedCurrencies.includes(input.currency as typeof supportedCurrencies[number]) ? input.currency! : 'UZS'; const range = periodRange({ ...input, period }); const previous = previousRange(range);
    const [orders, customers, products, audit, users, rates] = await Promise.all([this.orders.find({ relations: { items: true }, order: { createdAt: 'DESC' } }), this.customers.find({ order: { createdAt: 'DESC' } }), this.products.find({ relations: { variants: true }, order: { createdAt: 'DESC' } }), this.auditLogs.find({ order: { createdAt: 'DESC' }, take: 50 }), this.users.find({ order: { createdAt: 'DESC' } }), this.rates()]);
    const productMap = new Map(products.map((product) => [product.id, product])); const current = this.summary(orders, customers, products, range, productMap); const prior = this.summary(orders, customers, products, previous, productMap); const currencyReady = rates[currency] !== null;
    const financial = new Set(['revenue', 'averageOrderValue', 'profit']); const converted = (summary: typeof current) => Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, financial.has(key) && currencyReady ? this.convert(value, currency, rates) : value]));
    const rawCurrent = this.chart(orders, customers, audit, range, metric, granularity, productMap); const rawPrevious = this.chart(orders, customers, audit, previous, metric, granularity, productMap); const chartFinancial = metric === 'revenue' || metric === 'profit'; const points = (items: typeof rawCurrent) => items.map((item) => ({ ...item, value: chartFinancial && currencyReady ? this.convert(item.value, currency, rates) : item.value })); const currentPoints = points(rawCurrent), previousPoints = points(rawPrevious); const currentTotal = currentPoints.reduce((sum, item) => sum + item.value, 0), previousTotal = previousPoints.reduce((sum, item) => sum + item.value, 0);
    const latestActivity = new Map<string, AuditLog>(); audit.forEach((item) => { if (item.actorId && !latestActivity.has(item.actorId)) latestActivity.set(item.actorId, item); }); const names = new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim() || user.email])); const now = Date.now();
    return { period: { key: period, start: range.start.toISOString(), end: range.end.toISOString() }, currency: { code: currency, available: currencyReady, rates }, kpis: { current: converted(current), previous: converted(prior), changes: Object.fromEntries(Object.keys(current).map((key) => [key, percentChange(current[key as keyof typeof current], prior[key as keyof typeof prior])])) }, chart: { metric, granularity, current: currentPoints, previous: previousPoints, currentTotal, previousTotal, change: percentChange(currentTotal, previousTotal), financial: chartFinancial }, team: users.map((user) => { const activity = latestActivity.get(user.id); const lastSeen = activity?.createdAt ?? null; return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, isActive: user.isActive, lastSeen, online: Boolean(lastSeen && now - new Date(lastSeen).valueOf() < 5 * 60 * 1000) }; }), activity: audit.slice(0, 8).map((item) => ({ id: item.id, action: item.action, entityType: item.entityType, entityId: item.entityId, user: item.actorId ? names.get(item.actorId) ?? 'Tizim' : 'Tizim', createdAt: item.createdAt })) };
  }
  async listUsers() { return (await this.users.find({ order: { createdAt: 'DESC' } })).map(({ passwordHash: _hash, ...user }) => user); }
  async createUser(input: { email: string; password: string; firstName?: string; lastName?: string; role: UserRole }, actorId?: string) { const email = input.email.trim().toLowerCase(); if (await this.users.exists({ where: { email } })) throw new ConflictException('User already exists'); const user = await this.users.save(this.users.create({ email, passwordHash: await bcrypt.hash(input.password, 12), firstName: input.firstName ?? '', lastName: input.lastName ?? '', role: input.role })); await this.audit(actorId, 'created', 'user', user.id, { email, role: user.role }); const { passwordHash: _hash, ...safe } = user; return safe; }
  async updateUser(id: string, input: Partial<{ firstName: string; lastName: string; role: UserRole; isActive: boolean }>, actorId?: string) { const user = await this.users.preload({ id, ...input }); if (!user) throw new NotFoundException('User not found'); const saved = await this.users.save(user); await this.audit(actorId, 'updated', 'user', saved.id, input); const { passwordHash: _hash, ...safe } = saved; return safe; }
  logs() { return this.auditLogs.find({ order: { createdAt: 'DESC' }, take: 200 }); }
  audit(actorId: string | undefined, action: string, entityType: string, entityId: string | null, payload: Record<string, unknown>) { return this.auditLogs.save(this.auditLogs.create({ actorId: actorId ?? null, action, entityType, entityId, payload })); }
}
