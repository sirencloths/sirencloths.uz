import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuditLog, Customer, Order, Product, ProductEngagement, SiteSetting, SiteVisit, User, UserRole } from '../database/entities';

type DashboardPeriod = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';
type DashboardMetric = 'visitors' | 'customers' | 'orders' | 'units' | 'revenue' | 'profit';
type DashboardGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
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
    @InjectRepository(ProductEngagement) private readonly engagements: Repository<ProductEngagement>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(SiteVisit) private readonly visits: Repository<SiteVisit>,
    @InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>,
  ) {}

  private async rates() {
    const setting = await this.settings.findOneBy({ key: 'currency-rates' });
    const stored = setting?.value ?? {}; const raw = (stored.rates && typeof stored.rates === 'object' ? stored.rates : stored) as Record<string, unknown>;
    const rates: Record<string, number | null> = { UZS: 1, USD: null, EUR: null, RUB: null, KZT: null };
    for (const code of supportedCurrencies) { const candidate = raw[code]; const rate = numberOf(typeof candidate === 'string' || typeof candidate === 'number' ? candidate : null); if (rate > 0) rates[code] = rate; }
    return rates;
  }
  async currencyRates(refresh = false) {
    const setting = await this.settings.findOneBy({ key: 'currency-rates' });
    const stored = setting?.value ?? {}; const updatedAt = typeof stored.updatedAt === 'string' ? stored.updatedAt : null;
    const stale = !updatedAt || Date.now() - new Date(updatedAt).valueOf() > 60 * 60 * 1000;
    if (refresh || stale) {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error(`Rate source responded ${response.status}`);
        const body = await response.json() as { result?: string; time_last_update_utc?: string; rates?: Record<string, number> };
        const usdBase = Number(body.rates?.UZS); if (!Number.isFinite(usdBase) || usdBase <= 0) throw new Error('UZS rate unavailable');
        const rates: Record<string, number> = { UZS: 1, USD: usdBase };
        for (const code of ['EUR', 'RUB', 'KZT']) { const rate = Number(body.rates?.[code]); if (Number.isFinite(rate) && rate > 0) rates[code] = usdBase / rate; }
        const value = { rates, updatedAt: new Date().toISOString(), source: 'open.er-api.com', sourceUpdatedAt: body.time_last_update_utc ?? null };
        await this.settings.save(this.settings.create({ ...(setting ?? {}), key: 'currency-rates', value }));
        return { ...value, live: true };
      } catch (error) {
        if (refresh && !Object.keys((stored.rates as Record<string, unknown>) ?? {}).length) throw new NotFoundException('Kurs manbasiga ulanib bo‘lmadi. Internet aloqasini tekshiring.');
      }
    }
    const rates = await this.rates(); return { rates, updatedAt, source: typeof stored.source === 'string' ? stored.source : 'Saqlangan kurslar', sourceUpdatedAt: stored.sourceUpdatedAt ?? null, live: false };
  }
  private convert(value: number, currency: string, rates: Record<string, number | null>) { const rate = rates[currency]; return rate ? value / rate : value; }
  private profit(order: Order, products: Map<string, Product>) { return (order.items ?? []).reduce((total, item) => { const product = item.productId ? products.get(item.productId) : undefined; const variant = product?.variants?.find((entry) => entry.id === item.variantId); const cost = numberOf(variant?.attributes?.costPrice as string) + numberOf(variant?.attributes?.expensePrice as string); return total + numberOf(item.totalPrice) - cost * item.quantity; }, 0); }
  private summary(orders: Order[], customers: Customer[], products: Product[], range: { start: Date; end: Date }, productMap: Map<string, Product>) {
    const valid = orders.filter((order) => paidOrder(order) && inRange(order.createdAt, range)); const revenue = valid.reduce((sum, order) => sum + numberOf(order.totalAmount), 0);
    const units = valid.reduce((sum, order) => sum + (order.items ?? []).reduce((subtotal, item) => subtotal + item.quantity, 0), 0); const profit = valid.reduce((sum, order) => sum + this.profit(order, productMap), 0);
    const parentProducts = products.filter((product) => inRange(product.createdAt, range)).length;
    // A physical unit can be online or transferred to the offline store.
    // The overall inventory KPI must count both locations.
    const inventory = products.reduce((total, product) => total + (product.variants ?? []).reduce((sum, variant) => sum + Math.max(0, Number(variant.inventoryQuantity ?? 0)) + Math.max(0, Number(variant.offlineInventoryQuantity ?? 0)), 0), 0);
    return { customers: customers.filter((customer) => inRange(customer.createdAt, range)).length, revenue, products: parentProducts, inventory, baseProducts: parentProducts, units, orders: valid.length, averageOrderValue: valid.length ? revenue / valid.length : 0, profit };
  }
  private bucket(date: Date, granularity: DashboardGranularity) { if (granularity === 'hourly') return `${dateKey(date)} ${String(date.getHours()).padStart(2, '0')}:00`; if (granularity === 'yearly') return String(date.getFullYear()); if (granularity === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; if (granularity === 'weekly') return dateKey(addDays(startOfDay(date), -((date.getDay() + 6) % 7))); return dateKey(date); }
  private chartBuckets(range: { start: Date; end: Date }, granularity: DashboardGranularity, fullPeriod?: DashboardPeriod) {
    const start = new Date(range.start); const end = new Date(range.end);
    if (fullPeriod === 'today') end.setHours(23, 59, 59, 999);
    if (fullPeriod === 'month') end.setTime(new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999).valueOf());
    if (fullPeriod === 'year') end.setTime(new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999).valueOf());
    if (granularity === 'hourly') start.setMinutes(0, 0, 0);
    else if (granularity === 'daily') start.setHours(0, 0, 0, 0);
    else if (granularity === 'weekly') start.setTime(addDays(startOfDay(start), -((start.getDay() + 6) % 7)).valueOf());
    else if (granularity === 'monthly') start.setDate(1), start.setHours(0, 0, 0, 0);
    else start.setMonth(0, 1), start.setHours(0, 0, 0, 0);
    const result: string[] = []; const cursor = new Date(start);
    while (cursor <= end && result.length < 400) { result.push(this.bucket(cursor, granularity)); if (granularity === 'hourly') cursor.setHours(cursor.getHours() + 1); else if (granularity === 'daily') cursor.setDate(cursor.getDate() + 1); else if (granularity === 'weekly') cursor.setDate(cursor.getDate() + 7); else if (granularity === 'monthly') cursor.setMonth(cursor.getMonth() + 1); else cursor.setFullYear(cursor.getFullYear() + 1); }
    return result;
  }
  private chart(orders: Order[], customers: Customer[], visits: AuditLog[], range: { start: Date; end: Date }, metric: DashboardMetric, granularity: DashboardGranularity, productMap: Map<string, Product>, fullPeriod?: DashboardPeriod) {
    const values = new Map<string, number>(); const add = (date: Date, value: number) => { if (inRange(date, range)) { const key = this.bucket(date, granularity); values.set(key, (values.get(key) ?? 0) + value); } };
    if (metric === 'customers') customers.forEach((item) => add(item.createdAt, 1));
    else if (metric === 'visitors') visits.filter((item) => item.entityType === 'visit').forEach((item) => add(item.createdAt, 1));
    else if (metric === 'orders') orders.filter(paidOrder).forEach((item) => add(item.createdAt, 1));
    else if (metric === 'units') orders.filter(paidOrder).forEach((item) => add(item.createdAt, (item.items ?? []).reduce((sum, row) => sum + row.quantity, 0)));
    else if (metric === 'revenue') orders.filter(paidOrder).forEach((item) => add(item.createdAt, numberOf(item.totalAmount)));
    else orders.filter(paidOrder).forEach((item) => add(item.createdAt, this.profit(item, productMap)));
    return this.chartBuckets(range, granularity, fullPeriod).map((label) => ({ label, value: values.get(label) ?? 0 }));
  }

  async trafficSeries(input: Pick<DashboardInput, 'period' | 'granularity' | 'from' | 'to'> = {}) {
    const period = input.period ?? '30d';
    const granularity: DashboardGranularity = period === 'today' ? 'hourly' : period === 'year' ? 'monthly' : input.granularity ?? 'daily';
    const range = periodRange({ ...input, period });
    const [siteVisits, cartEngagements, orders] = await Promise.all([
      this.visits.find(),
      this.engagements.find({ where: { kind: 'cart', active: true } }),
      this.orders.find({ order: { createdAt: 'DESC' } }),
    ]);
    const visitCounts = new Map<string, number>();
    const cartVisitors = new Map<string, Set<string>>();
    const purchases = new Map<string, number>();
    const addVisit = (date: Date) => {
      if (!inRange(date, range)) return;
      const key = this.bucket(date, granularity);
      visitCounts.set(key, (visitCounts.get(key) ?? 0) + 1);
    };
    siteVisits.forEach((visit) => addVisit(new Date(`${visit.visitDate}T00:00:00`)));
    cartEngagements.forEach((engagement) => {
      if (!inRange(engagement.createdAt, range)) return;
      const key = this.bucket(engagement.createdAt, granularity);
      const visitors = cartVisitors.get(key) ?? new Set<string>();
      visitors.add(engagement.visitorId);
      cartVisitors.set(key, visitors);
    });
    orders.filter(paidOrder).forEach((order) => {
      if (!inRange(order.createdAt, range)) return;
      const key = this.bucket(order.createdAt, granularity);
      purchases.set(key, (purchases.get(key) ?? 0) + 1);
    });
    const points = this.chartBuckets(range, granularity, period).map((label) => {
      const visitors = visitCounts.get(label) ?? 0;
      const carts = cartVisitors.get(label)?.size ?? 0;
      const paidOrders = purchases.get(label) ?? 0;
      return { label, visitors, cartConversion: visitors ? carts / visitors * 100 : 0, purchaseConversion: visitors ? paidOrders / visitors * 100 : 0 };
    });
    return {
      visitors: points.map(({ label, visitors }) => ({ label, value: visitors })),
      cartConversion: points.map(({ label, cartConversion }) => ({ label, value: Number(cartConversion.toFixed(2)) })),
      purchaseConversion: points.map(({ label, purchaseConversion }) => ({ label, value: Number(purchaseConversion.toFixed(2)) })),
    };
  }

  async productSalesInsights() {
    const now = new Date(); const sevenDaysAgo = new Date(now.valueOf() - 7 * 24 * 60 * 60 * 1000);
    const [products, orders] = await Promise.all([
      this.products.find({ relations: { variants: true }, order: { createdAt: 'DESC' } }),
      this.orders.find({ relations: { items: true }, order: { createdAt: 'DESC' } }),
    ]);
    const recentUnits = new Map<string, number>(); const lastSoldAt = new Map<string, Date>();
    orders.filter(paidOrder).forEach((order) => (order.items ?? []).forEach((item) => {
      if (!item.productId) return;
      if (order.createdAt >= sevenDaysAgo) recentUnits.set(item.productId, (recentUnits.get(item.productId) ?? 0) + item.quantity);
      const previous = lastSoldAt.get(item.productId);
      if (!previous || previous < order.createdAt) lastSoldAt.set(item.productId, order.createdAt);
    }));
    const visible = products.filter((product) => product.status === 'active' && (product.scheduledAt ?? product.createdAt) <= now);
    const details = visible.map((product) => {
      const stock = (product.variants ?? []).filter((variant) => variant.isActive).reduce((sum, variant) => sum + Math.max(0, Number(variant.inventoryQuantity ?? 0)), 0);
      const lastSold = lastSoldAt.get(product.id) ?? null; const lastActivity = lastSold ?? product.createdAt;
      return { id: product.id, title: product.title, slug: product.slug, imageUrl: product.media?.slice().sort((left, right) => (left.position ?? 0) - (right.position ?? 0))[0]?.url ?? null, stock, units7d: recentUnits.get(product.id) ?? 0, lastSoldAt: lastSold?.toISOString() ?? null, daysWithoutSale: Math.max(0, Math.floor((now.valueOf() - lastActivity.valueOf()) / (24 * 60 * 60 * 1000))) };
    });
    return {
      generatedAt: now.toISOString(),
      fastSelling: details.filter((product) => product.units7d > 0).sort((left, right) => right.units7d - left.units7d || left.stock - right.stock).slice(0, 8),
      lowStock: details.filter((product) => product.stock <= 3).sort((left, right) => left.stock - right.stock || right.units7d - left.units7d).slice(0, 8),
      stale: details.filter((product) => product.stock > 0 && product.daysWithoutSale >= 7).sort((left, right) => right.daysWithoutSale - left.daysWithoutSale).slice(0, 8),
    };
  }

  async dashboard(input: DashboardInput = {}) {
    const period = input.period ?? '30d', metric = input.metric ?? 'revenue'; const granularity: DashboardGranularity = period === 'today' ? 'hourly' : period === 'year' ? 'monthly' : input.granularity ?? 'daily';
    const currency = supportedCurrencies.includes(input.currency as typeof supportedCurrencies[number]) ? input.currency! : 'UZS'; const range = periodRange({ ...input, period }); const previous = previousRange(range);
    const [orders, customers, products, audit, users, rates] = await Promise.all([this.orders.find({ relations: { items: true }, order: { createdAt: 'DESC' } }), this.customers.find({ order: { createdAt: 'DESC' } }), this.products.find({ relations: { variants: true }, order: { createdAt: 'DESC' } }), this.auditLogs.find({ order: { createdAt: 'DESC' } }), this.users.find({ order: { createdAt: 'DESC' } }), this.rates()]);
    const productMap = new Map(products.map((product) => [product.id, product])); const baseCurrent = this.summary(orders, customers, products, range, productMap); const basePrior = this.summary(orders, customers, products, previous, productMap); const visitorCount = (window: { start: Date; end: Date }) => audit.filter((item) => item.entityType === 'visit' && inRange(item.createdAt, window)).length; const visitors = visitorCount(range), previousVisitors = visitorCount(previous); const current = { ...baseCurrent, visitors, conversion: visitors ? (baseCurrent.orders / visitors) * 100 : 0 }; const prior = { ...basePrior, visitors: previousVisitors, conversion: previousVisitors ? (basePrior.orders / previousVisitors) * 100 : 0 }; const currencyReady = rates[currency] !== null;
    const financial = new Set(['revenue', 'averageOrderValue', 'profit']); const converted = (summary: typeof current) => Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, financial.has(key) && currencyReady ? this.convert(value, currency, rates) : value]));
    const rawCurrent = this.chart(orders, customers, audit, range, metric, granularity, productMap, period); const rawPrevious = this.chart(orders, customers, audit, previous, metric, granularity, productMap); const chartFinancial = metric === 'revenue' || metric === 'profit'; const points = (items: typeof rawCurrent) => items.map((item) => ({ ...item, value: chartFinancial && currencyReady ? this.convert(item.value, currency, rates) : item.value })); const currentPoints = points(rawCurrent), previousPoints = points(rawPrevious); const currentTotal = currentPoints.reduce((sum, item) => sum + item.value, 0), previousTotal = previousPoints.reduce((sum, item) => sum + item.value, 0);
    const financialSeries = (seriesMetric: 'revenue' | 'profit') => this.chart(orders, customers, audit, range, seriesMetric, granularity, productMap, period).map((item) => ({ ...item, value: currencyReady ? this.convert(item.value, currency, rates) : item.value })); const scopedOrders = orders.filter((order) => inRange(order.createdAt, range)); const refundedOrders = scopedOrders.filter((order) => order.status === 'refunded' || order.paymentStatus === 'refunded'); const refundBuckets = new Map<string, number>(); refundedOrders.forEach((order) => { const key = this.bucket(order.createdAt, granularity); refundBuckets.set(key, (refundBuckets.get(key) ?? 0) + numberOf(order.totalAmount)); }); const refundSeries = this.chartBuckets(range, granularity, period).map((label) => ({ label, value: currencyReady ? this.convert(refundBuckets.get(label) ?? 0, currency, rates) : refundBuckets.get(label) ?? 0 })); const paymentMethods: Record<string, { orders: number; revenue: number }> = {}; const topProducts = new Map<string, number>(), topSizes = new Map<string, number>(), topColors = new Map<string, number>(); const addTop = (map: Map<string, number>, label: string | null | undefined, quantity: number) => { const key = label?.trim(); if (key) map.set(key, (map.get(key) ?? 0) + quantity); }; scopedOrders.filter(paidOrder).forEach((order) => { const method = (order.paymentMethod || 'Boshqa').trim() || 'Boshqa'; const currentMethod = paymentMethods[method] ?? { orders: 0, revenue: 0 }; currentMethod.orders += 1; currentMethod.revenue += currencyReady ? this.convert(numberOf(order.totalAmount), currency, rates) : numberOf(order.totalAmount); paymentMethods[method] = currentMethod; (order.items ?? []).forEach((item) => { const product = item.productId ? productMap.get(item.productId) : undefined; const variant = product?.variants?.find((entry) => entry.id === item.variantId); addTop(topProducts, item.titleSnapshot || product?.title, item.quantity); addTop(topSizes, variant?.size, item.quantity); addTop(topColors, variant?.color, item.quantity); }); }); const rank = (map: Map<string, number>) => [...map.entries()].sort(([, left], [, right]) => right - left).slice(0, 7).map(([label, value]) => ({ label, value })); const productAnalysis = { products: rank(topProducts), sizes: rank(topSizes), colors: rank(topColors) }; const salesAnalysis = { revenue: currencyReady ? this.convert(baseCurrent.revenue, currency, rates) : baseCurrent.revenue, refunds: refundedOrders.reduce((total, order) => total + (currencyReady ? this.convert(numberOf(order.totalAmount), currency, rates) : numberOf(order.totalAmount)), 0), discounts: scopedOrders.reduce((total, order) => total + (currencyReady ? this.convert(numberOf(order.discountAmount), currency, rates) : numberOf(order.discountAmount)), 0), paymentMethods, revenueSeries: financialSeries('revenue'), refundSeries }; const monthlySales = Array.from({ length: 12 }, (_, month) => { const value = orders.filter((order) => paidOrder(order) && order.createdAt.getFullYear() === range.end.getFullYear() && order.createdAt.getMonth() === month).reduce((sum, order) => sum + numberOf(order.totalAmount), 0); return { label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(2020, month, 1)), value: currencyReady ? this.convert(value, currency, rates) : value }; });
    // This is a current stock health snapshot, so sales must be lifetime sales
    // and physical stock must include both online and offline locations.
    const soldByVariant = new Map<string, number>(); orders.filter(paidOrder).forEach((order) => (order.items ?? []).forEach((item) => { if (item.variantId) soldByVariant.set(item.variantId, (soldByVariant.get(item.variantId) ?? 0) + item.quantity); })); const inventoryByProduct = new Map<string, number>(); let onlineStock = 0, offlineStock = 0, lowStock = 0, deadStock = 0, soldUnits = 0, totalAdded = 0; products.forEach((product) => (product.variants ?? []).forEach((variant) => { const online = Math.max(0, Number(variant.inventoryQuantity ?? 0)); const offline = Math.max(0, Number(variant.offlineInventoryQuantity ?? 0)); const physical = online + offline; const sold = soldByVariant.get(variant.id) ?? 0; onlineStock += online; offlineStock += offline; soldUnits += sold; totalAdded += Math.max(0, Number(variant.totalInventoryAdded ?? physical)); if (online > 0 && online <= 3) lowStock += online; if (physical > 0 && sold === 0) deadStock += physical; inventoryByProduct.set(product.title, (inventoryByProduct.get(product.title) ?? 0) + physical); })); const stock = onlineStock + offlineStock; const availableForSellThrough = Math.max(totalAdded, stock + soldUnits); const inventoryAnalysis = { stock, onlineStock, offlineStock, totalAdded, lowStock, deadStock, sellThrough: availableForSellThrough ? soldUnits / availableForSellThrough * 100 : 0, topStock: rank(inventoryByProduct), distribution: [{ label: 'Online', value: onlineStock }, { label: 'Offline', value: offlineStock }, { label: 'Low stock (online)', value: lowStock }] };
    const customerNames = new Map(customers.map((customer) => [customer.id, `${customer.firstName} ${customer.lastName}`.trim() || customer.email])); const paidByCustomer = new Map<string, number>(); orders.filter(paidOrder).forEach((order) => { if (order.customerId) paidByCustomer.set(order.customerId, (paidByCustomer.get(order.customerId) ?? 0) + 1); }); const currentCustomerOrders = scopedOrders.filter(paidOrder).filter((order) => Boolean(order.customerId)); const returningCustomerIds = new Set(currentCustomerOrders.filter((order) => { const customer = customers.find((item) => item.id === order.customerId); return customer && customer.createdAt < range.start; }).map((order) => order.customerId!)); const newSeriesMap = new Map<string, number>(), returningSeriesMap = new Map<string, number>(); customers.filter((customer) => inRange(customer.createdAt, range)).forEach((customer) => { const key = this.bucket(customer.createdAt, granularity); newSeriesMap.set(key, (newSeriesMap.get(key) ?? 0) + 1); }); currentCustomerOrders.filter((order) => returningCustomerIds.has(order.customerId!)).forEach((order) => { const key = this.bucket(order.createdAt, granularity); returningSeriesMap.set(key, (returningSeriesMap.get(key) ?? 0) + 1); }); const customerRevenue = new Map<string, number>(); currentCustomerOrders.forEach((order) => { const id = order.customerId!; customerRevenue.set(id, (customerRevenue.get(id) ?? 0) + (currencyReady ? this.convert(numberOf(order.totalAmount), currency, rates) : numberOf(order.totalAmount))); }); const customerAnalysis = { newCustomers: customers.filter((customer) => inRange(customer.createdAt, range)).length, returningCustomers: returningCustomerIds.size, repeatPurchase: [...paidByCustomer.values()].filter((count) => count >= 2).length, newSeries: [...newSeriesMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([label, value]) => ({ label, value })), returningSeries: [...returningSeriesMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([label, value]) => ({ label, value })), topCustomers: [...customerRevenue.entries()].sort(([, left], [, right]) => right - left).slice(0, 7).map(([id, value]) => ({ label: customerNames.get(id) ?? 'Mijoz', value })) };
    const favorites = await this.engagements.count({ where: { kind: 'favorite', active: true } }); const cartAdds = await this.engagements.count({ where: { kind: 'cart', active: true } }); const visits = audit.filter((item) => item.entityType === 'visit' && inRange(item.createdAt, range)).length; const productViews = products.reduce((total, product) => total + numberOf(product.metadata?.views as string), 0); const trafficAnalysis = { funnel: [{ label: 'Visits', value: visits }, { label: 'Product View', value: productViews }, { label: 'Add to Cart', value: cartAdds }, { label: 'Checkout', value: scopedOrders.length }, { label: 'Purchase', value: baseCurrent.orders }], favorites, sources: [{ label: 'Direct', value: visits }, { label: 'Cart intent', value: cartAdds }, { label: 'Checkout', value: scopedOrders.length }, { label: 'Purchase', value: baseCurrent.orders }] };
    const dropPerformance = products.filter((product) => product.status === 'active' && (product.scheduledAt ?? product.createdAt).valueOf() <= Date.now()).sort((left, right) => (right.scheduledAt ?? right.createdAt).valueOf() - (left.scheduledAt ?? left.createdAt).valueOf()).slice(0, 12).map((product) => { const launchAt = product.scheduledAt ?? product.createdAt; const windows = [{ label: '1h', milliseconds: 60 * 60 * 1000 }, { label: '24h', milliseconds: 24 * 60 * 60 * 1000 }, { label: '7d', milliseconds: 7 * 24 * 60 * 60 * 1000 }]; const paidLines = orders.filter((order) => paidOrder(order) && order.createdAt >= launchAt && order.createdAt <= new Date(launchAt.valueOf() + 7 * 24 * 60 * 60 * 1000)).flatMap((order) => (order.items ?? []).filter((item) => item.productId === product.id).map((item) => ({ orderId: order.id, createdAt: order.createdAt, revenue: numberOf(item.totalPrice), quantity: item.quantity }))); const points = windows.map((window) => { const lines = paidLines.filter((line) => line.createdAt.valueOf() <= launchAt.valueOf() + window.milliseconds); return { label: window.label, revenue: lines.reduce((sum, line) => sum + line.revenue, 0), orders: new Set(lines.map((line) => line.orderId)).size, units: lines.reduce((sum, line) => sum + line.quantity, 0) }; }); return { id: product.id, title: product.title, launchAt: launchAt.toISOString(), points: points.map((point) => ({ label: point.label, revenue: currencyReady ? this.convert(point.revenue, currency, rates) : point.revenue, orders: point.orders, units: point.units })) }; });
    const latestActivity = new Map<string, AuditLog>(); audit.forEach((item) => { if (item.actorId && !latestActivity.has(item.actorId)) latestActivity.set(item.actorId, item); }); const names = new Map(users.map((user) => [user.id, `${user.firstName} ${user.lastName}`.trim() || user.email])); const now = Date.now();
    // These two customer cards are intentionally lifetime figures.  They must
    // not change when the dashboard period (day/week/month/year) is changed.
    const onlineCustomers = customers.filter((customer) => {
      const presence = customer.metadata?.presence as { online?: boolean; lastSeen?: string } | undefined;
      const lastSeen = presence?.lastSeen ? new Date(presence.lastSeen).valueOf() : 0;
      return Boolean(presence?.online && lastSeen && now - lastSeen < 5 * 60 * 1000);
    }).length;
    return { period: { key: period, start: range.start.toISOString(), end: range.end.toISOString() }, currency: { code: currency, available: currencyReady, rates }, kpis: { current: converted(current), previous: converted(prior), changes: Object.fromEntries(Object.keys(current).map((key) => [key, key === 'inventory' ? null : percentChange(current[key as keyof typeof current], prior[key as keyof typeof prior])])) }, lifetime: { registeredCustomers: customers.length, onlineCustomers }, chart: { metric, granularity, current: currentPoints, previous: previousPoints, currentTotal, previousTotal, change: percentChange(currentTotal, previousTotal), financial: chartFinancial }, salesProfit: { sales: financialSeries('revenue'), profit: financialSeries('profit') }, salesAnalysis, productAnalysis, dropPerformance, inventoryAnalysis, customerAnalysis, trafficAnalysis, monthlySales, team: users.map((user) => { const activity = latestActivity.get(user.id); const lastSeen = activity?.createdAt ?? null; return { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, isActive: user.isActive, lastSeen, online: Boolean(lastSeen && now - new Date(lastSeen).valueOf() < 5 * 60 * 1000) }; }), activity: audit.slice(0, 8).map((item) => ({ id: item.id, action: item.action, entityType: item.entityType, entityId: item.entityId, user: item.actorId ? names.get(item.actorId) ?? 'Tizim' : 'Tizim', createdAt: item.createdAt })) };
  }
  async listUsers() { return (await this.users.find({ order: { createdAt: 'DESC' } })).map(({ passwordHash: _hash, ...user }) => user); }
  async createUser(input: { email: string; password: string; firstName?: string; lastName?: string; role: UserRole }, actorId?: string) { const email = input.email.trim().toLowerCase(); if (await this.users.exists({ where: { email } })) throw new ConflictException('User already exists'); const user = await this.users.save(this.users.create({ email, passwordHash: await bcrypt.hash(input.password, 12), firstName: input.firstName ?? '', lastName: input.lastName ?? '', role: input.role })); await this.audit(actorId, 'created', 'user', user.id, { email, role: user.role }); const { passwordHash: _hash, ...safe } = user; return safe; }
  async updateUser(id: string, input: Partial<{ firstName: string; lastName: string; role: UserRole; isActive: boolean }>, actorId?: string) { const user = await this.users.preload({ id, ...input }); if (!user) throw new NotFoundException('User not found'); const saved = await this.users.save(user); await this.audit(actorId, 'updated', 'user', saved.id, input); const { passwordHash: _hash, ...safe } = saved; return safe; }
  logs() { return this.auditLogs.find({ order: { createdAt: 'DESC' }, take: 200 }); }
  audit(actorId: string | undefined, action: string, entityType: string, entityId: string | null, payload: Record<string, unknown>) { return this.auditLogs.save(this.auditLogs.create({ actorId: actorId ?? null, action, entityType, entityId, payload })); }
}
