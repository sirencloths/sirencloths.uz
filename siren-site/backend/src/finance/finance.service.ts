import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceEntry, FinanceEntryType, OfflineDailyReport, OfflineSale, Order, OrderStatus, ProductVariant } from '../database/entities';

const amount = (value: unknown) => Number(value ?? 0) || 0;
const paid = (order: Order) => order.paymentStatus === 'paid' && order.status !== OrderStatus.REFUNDED;
const refundReason = (note: string | null) => { try { const parsed = JSON.parse(note || '{}'); return typeof parsed?.cancellation?.reason === 'string' ? parsed.cancellation.reason : null; } catch { return null; } };

@Injectable()
export class FinanceService {
  constructor(@InjectRepository(FinanceEntry) private readonly entries: Repository<FinanceEntry>, @InjectRepository(Order) private readonly orders: Repository<Order>, @InjectRepository(OfflineSale) private readonly offlineSales: Repository<OfflineSale>, @InjectRepository(OfflineDailyReport) private readonly offlineReports: Repository<OfflineDailyReport>, @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>) {}

  async overview() {
    const [orders, manual, offlineSales, offlineReports] = await Promise.all([this.orders.find({ relations: { customer: true, items: true }, order: { createdAt: 'DESC' } }), this.entries.find({ order: { occurredAt: 'DESC' } }), this.offlineSales.find({ where: { isVoided: false }, order: { createdAt: 'DESC' } }), this.offlineReports.find({ order: { reportDate: 'DESC' } })]);
    const paidOrders = orders.filter(paid); const refunds = orders.filter((order) => order.status === OrderStatus.REFUNDED || order.paymentStatus === 'refunded');
    const onlineRevenue = paidOrders.reduce((sum, order) => sum + amount(order.totalAmount), 0);
    const offlineRevenue = offlineSales.reduce((sum, sale) => sum + amount(sale.totalAmount), 0);
    const grossRevenue = onlineRevenue + offlineRevenue;
    const refundTotal = refunds.reduce((sum, order) => sum + amount(order.totalAmount), 0);
    const manualIncome = manual.filter((entry) => entry.type === FinanceEntryType.INCOME).reduce((sum, entry) => sum + amount(entry.amount), 0);
    const manualExpenses = manual.filter((entry) => entry.type === FinanceEntryType.EXPENSE).reduce((sum, entry) => sum + amount(entry.amount), 0);
    const offlineExpenses = offlineReports.reduce((sum, report) => sum + amount(report.expenseAmount), 0);
    const expenses = manualExpenses + offlineExpenses;
    const transactions = [
      ...paidOrders.map((order) => ({ id: `order-${order.id}`, source: 'order', type: 'income', title: `Buyurtma #${order.orderNumber}`, category: order.paymentMethod || 'Onlayn to‘lov', amount: amount(order.totalAmount), currencyCode: order.currencyCode, occurredAt: order.createdAt, note: null, order: { id: order.id, orderNumber: order.orderNumber, customerName: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || order.customer?.email || 'Mijoz', phone: order.customer?.phone ?? null, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus, items: order.items.map((item) => ({ title: item.titleSnapshot, sku: item.skuSnapshot, quantity: item.quantity, total: item.totalPrice })) } })),
      ...offlineSales.map((sale) => ({ id: `offline-sale-${sale.id}`, source: 'offline_sale', type: 'income', title: `Kassa cheki #${sale.receiptNumber}`, category: `Offline · ${sale.paymentMethod}`, amount: amount(sale.totalAmount), currencyCode: sale.currencyCode, occurredAt: sale.createdAt, note: null })),
      ...refunds.map((order) => ({ id: `refund-${order.id}`, source: 'refund', type: 'refund', title: `Refund #${order.orderNumber}`, category: 'Qaytarilgan buyurtma', amount: -amount(order.totalAmount), currencyCode: order.currencyCode, occurredAt: order.updatedAt, note: refundReason(order.note), order: { id: order.id, orderNumber: order.orderNumber, customerName: [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(' ') || order.customer?.email || 'Mijoz', phone: order.customer?.phone ?? null, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus, items: order.items.map((item) => ({ title: item.titleSnapshot, sku: item.skuSnapshot, quantity: item.quantity, total: item.totalPrice })) } })),
      ...offlineReports.filter((report) => amount(report.expenseAmount) > 0).map((report) => ({ id: `offline-report-${report.id}`, source: 'offline_report', type: 'expense', title: `Offline hisobot xarajati · ${report.reportDate}`, category: 'Offline do‘kon', amount: -amount(report.expenseAmount), currencyCode: 'UZS', occurredAt: new Date(`${report.reportDate}T12:00:00.000Z`), note: report.note })),
      ...manual.map((entry) => ({ id: entry.id, source: 'manual', type: entry.type, title: entry.title, category: entry.category, amount: entry.type === FinanceEntryType.EXPENSE ? -amount(entry.amount) : amount(entry.amount), currencyCode: entry.currencyCode, occurredAt: entry.occurredAt, note: entry.note, receiptUrl: entry.receiptUrl })),
    ].sort((left, right) => new Date(right.occurredAt).valueOf() - new Date(left.occurredAt).valueOf());
    return { summary: { grossRevenue, onlineRevenue, offlineRevenue, refunds: refundTotal, manualIncome, expenses, offlineExpenses, netRevenue: grossRevenue - refundTotal + manualIncome, netProfit: grossRevenue - refundTotal + manualIncome - expenses, paidOrders: paidOrders.length + offlineSales.length }, transactions };
  }

  async reports(scope = 'combined', from?: string, to?: string) {
    const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
    const [orders, sales, reports, manual, variants] = await Promise.all([
      this.orders.find({ relations: { customer: true, items: true }, order: { createdAt: 'DESC' } }),
      this.offlineSales.find({ where: { isVoided: false }, relations: { cashier: true, items: true }, order: { createdAt: 'DESC' } }),
      this.offlineReports.find({ order: { reportDate: 'DESC' } }),
      this.entries.find({ order: { occurredAt: 'DESC' } }),
      this.variants.find(),
    ]);
    const inRange = (date: Date) => date >= start && date <= end;
    const onlineOrders = orders.filter((order) => inRange(order.createdAt));
    const offline = sales.filter((sale) => inRange(sale.createdAt));
    const paidOrders = onlineOrders.filter(paid);
    const refunded = onlineOrders.filter((order) => order.status === OrderStatus.REFUNDED || order.paymentStatus === 'refunded');
    const onlineRevenue = paidOrders.reduce((sum, order) => sum + amount(order.totalAmount), 0);
    const onlineDiscounts = paidOrders.reduce((sum, order) => sum + amount(order.discountAmount), 0);
    const refunds = refunded.reduce((sum, order) => sum + amount(order.totalAmount), 0);
    const offlineRevenue = offline.reduce((sum, sale) => sum + amount(sale.totalAmount), 0);
    const offlineDiscounts = offline.reduce((sum, sale) => sum + amount(sale.discountAmount), 0);
    const offlineExpenses = reports.filter((report) => report.reportDate >= start.toISOString().slice(0, 10) && report.reportDate <= end.toISOString().slice(0, 10)).reduce((sum, report) => sum + amount(report.expenseAmount), 0);
    const manualRows = manual.filter((entry) => inRange(entry.occurredAt));
    const manualIncome = manualRows.filter((entry) => entry.type === FinanceEntryType.INCOME).reduce((sum, entry) => sum + amount(entry.amount), 0);
    const manualExpenses = manualRows.filter((entry) => entry.type === FinanceEntryType.EXPENSE).reduce((sum, entry) => sum + amount(entry.amount), 0);
    const paymentBreakdown = Object.entries([...paidOrders, ...offline].reduce<Record<string, { count: number; amount: number }>>((all, row) => { const key = row.paymentMethod || 'Boshqa'; const current = all[key] ?? { count: 0, amount: 0 }; current.count += 1; current.amount += amount(row.totalAmount); all[key] = current; return all; }, {})).map(([method, value]) => ({ method, ...value }));
    const skuByVariant = new Map(variants.map((variant) => [variant.id, variant.sku]));
    const productBreakdown = Object.values([...paidOrders.flatMap((order) => order.items), ...offline.flatMap((sale) => sale.items)].reduce<Record<string, { title: string; sku: string | null; quantity: number; revenue: number }>>((all, item) => { const sku = item.skuSnapshot || (item.variantId ? skuByVariant.get(item.variantId) : null) || null; const key = sku || item.titleSnapshot; const current = all[key] ?? { title: item.titleSnapshot, sku, quantity: 0, revenue: 0 }; current.quantity += item.quantity; current.revenue += amount(item.totalPrice); all[key] = current; return all; }, {})).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
    const statusBreakdown = { paid: paidOrders.length, pending: onlineOrders.filter((order) => order.paymentStatus === 'pending').length, cancelled: onlineOrders.filter((order) => order.status === OrderStatus.CANCELLED).length, refunded: refunded.length, offlineReceipts: offline.length };
    const online = { revenue: onlineRevenue, discounts: onlineDiscounts, refunds, net: onlineRevenue - refunds, orders: onlineOrders.length, paid: paidOrders.length, averageOrder: paidOrders.length ? onlineRevenue / paidOrders.length : 0 };
    const offlineSummary = { revenue: offlineRevenue, discounts: offlineDiscounts, expenses: offlineExpenses, net: offlineRevenue - offlineExpenses, receipts: offline.length, averageReceipt: offline.length ? offlineRevenue / offline.length : 0 };
    const combined = { revenue: onlineRevenue + offlineRevenue + manualIncome, discounts: onlineDiscounts + offlineDiscounts, refunds, expenses: offlineExpenses + manualExpenses, net: onlineRevenue + offlineRevenue + manualIncome - refunds - offlineExpenses - manualExpenses, transactions: onlineOrders.length + offline.length, averageCheck: onlineOrders.length + offline.length ? (onlineRevenue + offlineRevenue) / (onlineOrders.length + offline.length) : 0 };
    return { scope, period: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }, online, offline: offlineSummary, combined, manual: { income: manualIncome, expenses: manualExpenses }, paymentBreakdown, productBreakdown, statusBreakdown, transactions: scope === 'online' ? paidOrders.map((order) => ({ id: order.id, number: `#${order.orderNumber}`, date: order.createdAt, payment: order.paymentMethod, amount: amount(order.totalAmount), discount: amount(order.discountAmount), status: order.paymentStatus })) : scope === 'offline' ? offline.map((sale) => ({ id: sale.id, number: `#${sale.receiptNumber}`, date: sale.createdAt, payment: sale.paymentMethod, amount: amount(sale.totalAmount), discount: amount(sale.discountAmount), cashier: `${sale.cashier?.firstName ?? ''} ${sale.cashier?.lastName ?? ''}`.trim() || sale.cashier?.email || 'Kassir' })) : [...paidOrders.map((order) => ({ id: `online-${order.id}`, source: 'Online', number: `#${order.orderNumber}`, date: order.createdAt, payment: order.paymentMethod, amount: amount(order.totalAmount), discount: amount(order.discountAmount) })), ...offline.map((sale) => ({ id: `offline-${sale.id}`, source: 'Offline', number: `#${sale.receiptNumber}`, date: sale.createdAt, payment: sale.paymentMethod, amount: amount(sale.totalAmount), discount: amount(sale.discountAmount) }))].sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf()) };
  }

  async create(actorId: string, input: Partial<Omit<FinanceEntry, 'amount' | 'occurredAt'>> & { amount?: string | number; occurredAt?: string | Date }) {
    if (!input.title?.trim() || !input.category?.trim() || !input.type || amount(input.amount) <= 0) throw new BadRequestException('Nomi, kategoriya, turi va musbat summa majburiy.');
    if (![FinanceEntryType.INCOME, FinanceEntryType.EXPENSE].includes(input.type)) throw new BadRequestException('Noto‘g‘ri moliyaviy tur.');
    return this.entries.save(this.entries.create({ type: input.type, title: input.title.trim(), category: input.category.trim(), amount: String(amount(input.amount)), currencyCode: (input.currencyCode || 'UZS').toUpperCase(), occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(), note: input.note?.trim() || null, receiptUrl: input.receiptUrl?.trim() || null, createdBy: actorId }));
  }
}
