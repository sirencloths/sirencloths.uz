import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceEntry, FinanceEntryType, OfflineDailyReport, OfflineSale, Order, OrderStatus } from '../database/entities';

const amount = (value: unknown) => Number(value ?? 0) || 0;
const paid = (order: Order) => order.paymentStatus === 'paid' && order.status !== OrderStatus.REFUNDED;

@Injectable()
export class FinanceService {
  constructor(@InjectRepository(FinanceEntry) private readonly entries: Repository<FinanceEntry>, @InjectRepository(Order) private readonly orders: Repository<Order>, @InjectRepository(OfflineSale) private readonly offlineSales: Repository<OfflineSale>, @InjectRepository(OfflineDailyReport) private readonly offlineReports: Repository<OfflineDailyReport>) {}

  async overview() {
    const [orders, manual, offlineSales, offlineReports] = await Promise.all([this.orders.find({ order: { createdAt: 'DESC' } }), this.entries.find({ order: { occurredAt: 'DESC' } }), this.offlineSales.find({ where: { isVoided: false }, order: { createdAt: 'DESC' } }), this.offlineReports.find({ order: { reportDate: 'DESC' } })]);
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
      ...paidOrders.map((order) => ({ id: `order-${order.id}`, source: 'order', type: 'income', title: `Buyurtma #${order.orderNumber}`, category: order.paymentMethod || 'Onlayn to‘lov', amount: amount(order.totalAmount), currencyCode: order.currencyCode, occurredAt: order.createdAt, note: order.customer?.email ?? null })),
      ...offlineSales.map((sale) => ({ id: `offline-sale-${sale.id}`, source: 'offline_sale', type: 'income', title: `Kassa cheki #${sale.receiptNumber}`, category: `Offline · ${sale.paymentMethod}`, amount: amount(sale.totalAmount), currencyCode: sale.currencyCode, occurredAt: sale.createdAt, note: null })),
      ...refunds.map((order) => ({ id: `refund-${order.id}`, source: 'refund', type: 'refund', title: `Refund #${order.orderNumber}`, category: 'Qaytarilgan buyurtma', amount: -amount(order.totalAmount), currencyCode: order.currencyCode, occurredAt: order.updatedAt, note: order.note })),
      ...offlineReports.filter((report) => amount(report.expenseAmount) > 0).map((report) => ({ id: `offline-report-${report.id}`, source: 'offline_report', type: 'expense', title: `Offline hisobot xarajati · ${report.reportDate}`, category: 'Offline do‘kon', amount: -amount(report.expenseAmount), currencyCode: 'UZS', occurredAt: new Date(`${report.reportDate}T12:00:00.000Z`), note: report.note })),
      ...manual.map((entry) => ({ id: entry.id, source: 'manual', type: entry.type, title: entry.title, category: entry.category, amount: entry.type === FinanceEntryType.EXPENSE ? -amount(entry.amount) : amount(entry.amount), currencyCode: entry.currencyCode, occurredAt: entry.occurredAt, note: entry.note, receiptUrl: entry.receiptUrl })),
    ].sort((left, right) => new Date(right.occurredAt).valueOf() - new Date(left.occurredAt).valueOf());
    return { summary: { grossRevenue, onlineRevenue, offlineRevenue, refunds: refundTotal, manualIncome, expenses, offlineExpenses, netRevenue: grossRevenue - refundTotal + manualIncome, netProfit: grossRevenue - refundTotal + manualIncome - expenses, paidOrders: paidOrders.length + offlineSales.length }, transactions };
  }

  async create(actorId: string, input: Partial<Omit<FinanceEntry, 'amount' | 'occurredAt'>> & { amount?: string | number; occurredAt?: string | Date }) {
    if (!input.title?.trim() || !input.category?.trim() || !input.type || amount(input.amount) <= 0) throw new BadRequestException('Nomi, kategoriya, turi va musbat summa majburiy.');
    if (![FinanceEntryType.INCOME, FinanceEntryType.EXPENSE].includes(input.type)) throw new BadRequestException('Noto‘g‘ri moliyaviy tur.');
    return this.entries.save(this.entries.create({ type: input.type, title: input.title.trim(), category: input.category.trim(), amount: String(amount(input.amount)), currencyCode: (input.currencyCode || 'UZS').toUpperCase(), occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(), note: input.note?.trim() || null, receiptUrl: input.receiptUrl?.trim() || null, createdBy: actorId }));
  }
}
