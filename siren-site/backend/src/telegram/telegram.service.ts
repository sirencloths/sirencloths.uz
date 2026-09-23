import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { OfflineDailyReport, OfflineSale, Order, OrderStatus } from '../database/entities';

type BotChannel = 'orders' | 'control';
const amount = (value: unknown) => Number(value ?? 0) || 0;
const fmt = (value: number) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value))} UZS`;
const tashkentParts = (date = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
const localDateKey = (date: Date) => { const part = tashkentParts(date); return `${part.year}-${part.month}-${part.day}`; };
const rangeForLocalDays = (from: string, to: string) => {
  const start = new Date(`${from}T00:00:00+05:00`);
  const end = new Date(`${to}T23:59:59.999+05:00`);
  return { start, end };
};

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private scheduler?: ReturnType<typeof setInterval>;
  private readonly delivered = new Set<string>();

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OfflineSale) private readonly offlineSales: Repository<OfflineSale>,
    @InjectRepository(OfflineDailyReport) private readonly offlineReports: Repository<OfflineDailyReport>,
  ) {}

  onModuleInit() { this.scheduler = setInterval(() => void this.runScheduledReports(), 30_000); }
  onModuleDestroy() { if (this.scheduler) clearInterval(this.scheduler); }

  private config(channel: BotChannel) {
    const prefix = channel === 'orders' ? 'TELEGRAM_ORDERS' : 'TELEGRAM_CONTROL';
    return { token: process.env[`${prefix}_BOT_TOKEN`]?.trim(), chatId: process.env[`${prefix}_CHAT_ID`]?.trim() };
  }

  async send(channel: BotChannel, text: string) {
    const { token, chatId } = this.config(channel);
    if (!token || !chatId) return false;
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      });
      if (!response.ok) this.logger.warn(`Telegram ${channel} xabari yuborilmadi: ${response.status}`);
      return response.ok;
    } catch (error) {
      this.logger.warn(`Telegram ${channel} ulanish xatosi: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async orderCreated(order: Order) { return this.send('orders', this.orderMessage('🛒 YANGI BUYURTMA', order)); }
  async orderStatusChanged(order: Order) {
    const received = ['picked_up', 'delivered', 'handed_over'].includes(order.fulfillmentStatus);
    const heading = order.status === OrderStatus.REFUNDED || order.paymentStatus === 'refunded'
      ? '↩️ REFUND QAYTARILDI'
      : received
        ? '🎉 BUYURTMA MIJOZ QO‘LIDA'
        : order.paymentStatus === 'paid'
          ? '✅ TO‘LOV TASDIQLANDI'
          : null;
    if (!heading) return false;
    return this.send('orders', this.orderMessage(heading, order));
  }
  async control(text: string) { return this.send('control', text); }

  private orderMessage(heading: string, order: Order) {
    const customer = order.customer;
    const shipping = order.shippingAddress ?? {};
    const pickup = shipping.fulfillmentMethod === 'pickup';
    const itemLines = (order.items ?? []).map((item) => `• ${item.titleSnapshot}${item.skuSnapshot ? ` / ${item.skuSnapshot}` : ''} × ${item.quantity}`).join('\n');
    const destination = pickup
      ? `Olib ketish nuqtasi: ${String(shipping.pickupLocationName ?? 'Tanlanmagan')}\n${String(shipping.city ?? '')} ${String(shipping.address ?? '')}`.trim()
      : `Yetkazib berish: Kuryer\nManzil: ${[shipping.city, shipping.address ?? shipping.line1].filter(Boolean).join(', ') || 'Kiritilmagan'}`;
    const paymentBadge = order.paymentStatus === 'paid'
      ? '✅ TO‘LOV TASDIQLANDI'
      : order.paymentStatus === 'refunded'
        ? '↩️ PUL QAYTARILDI'
        : order.paymentStatus === 'pending'
          ? '🟡 TO‘LOV KUTILMOQDA'
          : '🔴 TO‘LOV QILINMAGAN';
    return `${heading} #${order.orderNumber}\n\n${paymentBadge}\n\nMijoz: ${[customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || 'Noma’lum'}\nTelefon: ${customer?.phone || 'Kiritilmagan'}\n\n${itemLines || `Mahsulotlar: ${(order.items ?? []).length} ta`}\n\nTo‘lov: ${order.paymentMethod || 'Kiritilmagan'}\nJami: ${fmt(amount(order.totalAmount))}\n\n${destination}\n\nVaqt: ${new Intl.DateTimeFormat('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`;
  }

  private async runScheduledReports() {
    const now = tashkentParts();
    if (now.hour === '00' && now.minute === '00') {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const key = `daily:${localDateKey(yesterday)}`;
      if (!this.delivered.has(key)) { this.delivered.add(key); await this.sendDaily(localDateKey(yesterday)); }
    }
    if (now.weekday === 'Mon' && now.hour === '09' && now.minute === '00') {
      const end = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const key = `weekly:${localDateKey(end)}`;
      if (!this.delivered.has(key)) { this.delivered.add(key); await this.sendPeriod('weekly', localDateKey(start), localDateKey(end)); }
    }
    if (now.day === '01' && now.hour === '09' && now.minute === '00') {
      const previous = new Date(Date.UTC(Number(now.year), Number(now.month) - 1, 0));
      const from = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const to = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}-${String(previous.getUTCDate()).padStart(2, '0')}`;
      const key = `monthly:${from}`;
      if (!this.delivered.has(key)) { this.delivered.add(key); await this.sendPeriod('monthly', from, to); }
    }
  }

  private async sendDaily(date: string) {
    const totals = await this.totals(date, date);
    await this.send('orders', `📊 ${date} — KUNLIK HISOBOT\n\n🌐 SAYT JAMI\n• Buyurtmalar: ${totals.online.orders} ta\n• To‘langan: ${totals.online.paid} ta\n• Kutilmoqda: ${totals.online.pending} ta\n• Bekor qilingan: ${totals.online.cancelled} ta\n• Savdo: ${fmt(totals.online.revenue)}\n• Refund: −${fmt(totals.online.refunds)}\n• Sayt sof tushumi: ${fmt(totals.online.net)}\n\n🏪 OFFLINE DO‘KON JAMI\n• Cheklar: ${totals.offline.count} ta\n• Savdo: ${fmt(totals.offline.revenue)}\n• Xarajat: −${fmt(totals.offline.expenses)}\n• Offline sof tushumi: ${fmt(totals.offline.net)}\n\n━━━━━━━━━━━━━━\n💰 UMUMIY JAMI\n• Savdo: ${fmt(totals.online.revenue + totals.offline.revenue)}\n• Refund va xarajat: −${fmt(totals.online.refunds + totals.offline.expenses)}\n• Sof tushum: ${fmt(totals.online.net + totals.offline.net)}\n• Jami buyurtma va cheklar: ${totals.online.orders + totals.offline.count} ta`);
  }

  private async sendPeriod(kind: 'weekly' | 'monthly', from: string, to: string) {
    const totals = await this.totals(from, to);
    const tag = kind === 'weekly' ? '#ANALITIKA #HAFTALIK' : '#ANALITIKA #OYLIK';
    const title = kind === 'weekly' ? `${from} — ${to}` : from.slice(0, 7);
    await this.send('orders', `${tag}\n\n📈 ${title} — ${kind === 'weekly' ? 'HAFTALIK' : 'OYLIK'} HISOBOT\n\n🌐 Sayt savdosi: ${fmt(totals.online.revenue)}\n🏪 Offline savdo: ${fmt(totals.offline.revenue)}\n💰 Umumiy savdo: ${fmt(totals.online.revenue + totals.offline.revenue)}\n\n• Sof tushum: ${fmt(totals.online.net + totals.offline.net)}\n• Jami savdolar: ${totals.online.orders + totals.offline.count} ta\n• Refund: −${fmt(totals.online.refunds)}`);
  }

  private async totals(from: string, to: string) {
    const range = rangeForLocalDays(from, to);
    const [orders, sales, reports] = await Promise.all([
      this.orders.find({ where: { createdAt: Between(range.start, range.end) } }),
      this.offlineSales.find({ where: { createdAt: Between(range.start, range.end), isVoided: false } }),
      this.offlineReports.find({ where: { reportDate: Between(from, to) } }),
    ]);
    const paid = orders.filter((order) => order.paymentStatus === 'paid');
    const refunded = orders.filter((order) => order.status === OrderStatus.REFUNDED || order.paymentStatus === 'refunded');
    const revenue = paid.reduce((sum, order) => sum + amount(order.totalAmount), 0);
    const refunds = refunded.reduce((sum, order) => sum + amount(order.totalAmount), 0);
    const offlineRevenue = sales.reduce((sum, sale) => sum + amount(sale.totalAmount), 0);
    const expenses = reports.reduce((sum, report) => sum + amount(report.expenseAmount), 0);
    return { online: { orders: orders.length, paid: paid.length, pending: orders.filter((order) => order.paymentStatus === 'pending').length, cancelled: orders.filter((order) => order.status === OrderStatus.CANCELLED).length, revenue, refunds, net: revenue - refunds }, offline: { count: sales.length, revenue: offlineRevenue, expenses, net: offlineRevenue - expenses } };
  }
}
