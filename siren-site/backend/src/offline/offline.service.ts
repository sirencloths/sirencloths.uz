import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OfflineDailyReport, OfflineSale, OfflineSaleItem, OfflineSaleNote, ProductVariant, UserRole } from '../database/entities';

type Actor = { id: string; role: UserRole };
type SaleInput = { items: Array<{ variantId: string; quantity: number }>; paymentMethod: string; discountAmount?: number; note?: string; noteImageUrl?: string };
const paymentKeys = ['cash', 'card', 'transfer'] as const;
const dayKey = (value: Date) => value.toISOString().slice(0, 10);
const n = (value: unknown) => Number(value ?? 0) || 0;
const receiptEan13 = (receiptNumber: number) => {
  const payload = `200${String(receiptNumber).padStart(9, '0')}`;
  const sum = [...payload].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${payload}${(10 - (sum % 10)) % 10}`;
};

@Injectable()
export class OfflineService {
  constructor(
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(OfflineSale) private readonly saleRepo: Repository<OfflineSale>,
    @InjectRepository(OfflineSaleNote) private readonly noteRepo: Repository<OfflineSaleNote>,
    @InjectRepository(OfflineDailyReport) private readonly reportRepo: Repository<OfflineDailyReport>,
    private readonly dataSource: DataSource,
  ) {}

  async inventory() {
    const rows = await this.variants.find({ relations: { product: true }, order: { updatedAt: 'DESC' } });
    return rows.filter((row) => row.isActive && row.offlineInventoryQuantity > 0).map((row) => this.inventoryRow(row));
  }
  async scan(ean: string) {
    const value = ean.trim(); const variant = await this.variants.findOne({ where: [{ barcode: value }, { sku: value }], relations: { product: true } });
    if (!variant || !variant.isActive || variant.offlineInventoryQuantity < 1) throw new NotFoundException('EAN-13 yoki SKU bo‘yicha offline mahsulot topilmadi.');
    return this.inventoryRow(variant);
  }
  async createSale(input: SaleInput, actor: Actor) {
    const paymentMethod = input.paymentMethod.trim().toLowerCase();
    if (!paymentKeys.includes(paymentMethod as typeof paymentKeys[number])) throw new BadRequestException('To‘lov turi noto‘g‘ri.');
    if (!input.items.length) throw new BadRequestException('Sotuv uchun kamida bitta mahsulot kiriting.');
    const merged = new Map<string, number>(); input.items.forEach((row) => merged.set(row.variantId, (merged.get(row.variantId) ?? 0) + Number(row.quantity)));
    return this.dataSource.transaction(async (manager) => {
      const rows: Array<{ variant: ProductVariant; quantity: number; price: number }> = [];
      for (const [variantId, quantity] of merged) {
        if (!Number.isInteger(quantity) || quantity < 1) throw new BadRequestException('Miqdor noto‘g‘ri.');
        const variant = await manager.findOne(ProductVariant, { where: { id: variantId }, relations: { product: true } });
        if (!variant || !variant.isActive || !variant.product) throw new NotFoundException('Variant topilmadi.');
        if (variant.offlineInventoryQuantity < quantity) throw new BadRequestException(`${variant.sku} uchun offline qoldiq yetarli emas.`);
        const price = n(variant.price ?? variant.product.price); if (price <= 0) throw new BadRequestException(`${variant.sku} narxi kiritilmagan.`);
        const updated = await manager.createQueryBuilder().update(ProductVariant).set({ offlineInventoryQuantity: () => `CAST(offline_inventory_quantity AS INTEGER) - ${quantity}` }).where('id = :variantId AND offline_inventory_quantity >= :quantity', { variantId, quantity }).execute();
        if (updated.affected !== 1) throw new BadRequestException(`${variant.sku} qoldig‘i yangilandi; qayta urinib ko‘ring.`);
        rows.push({ variant, quantity, price });
      }
      const subtotal = rows.reduce((sum, row) => sum + row.price * row.quantity, 0); const discount = Math.round(n(input.discountAmount));
      if (discount > subtotal) throw new BadRequestException('Chegirma mahsulotlar jamidan katta bo‘lishi mumkin emas.');
      const sale = await manager.save(OfflineSale, manager.create(OfflineSale, { cashierId: actor.id, paymentMethod, currencyCode: 'UZS', subtotalAmount: String(subtotal), discountAmount: String(discount), totalAmount: String(subtotal - discount), isVoided: false, voidReason: null }));
      sale.receiptBarcode = receiptEan13(Number(sale.receiptNumber)); await manager.save(sale);
      for (const row of rows) {
        const media = row.variant.product.media ?? []; const imageUrl = [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null;
        await manager.save(OfflineSaleItem, manager.create(OfflineSaleItem, { saleId: sale.id, productId: row.variant.productId, variantId: row.variant.id, titleSnapshot: row.variant.product.title, skuSnapshot: row.variant.sku, barcodeSnapshot: row.variant.barcode, imageUrl, quantity: row.quantity, unitPrice: String(row.price), totalPrice: String(row.price * row.quantity) }));
      }
      if (input.note?.trim() || input.noteImageUrl?.trim()) await manager.save(OfflineSaleNote, manager.create(OfflineSaleNote, { saleId: sale.id, authorId: actor.id, body: input.note?.trim() ?? '', imageUrl: input.noteImageUrl?.trim() || null }));
      // Read through the transaction manager: the sale is not committed yet,
      // so the shared repository cannot see it at this point.
      return manager.findOneOrFail(OfflineSale, { where: { id: sale.id }, relations: { cashier: true, items: true, notes: true } });
    });
  }
  async sales(actor: Actor) {
    const where = actor.role === UserRole.SUPER_ADMIN ? {} : { cashierId: actor.id };
    const sales = await this.saleRepo.find({ where, relations: { cashier: true, items: true, notes: true }, order: { createdAt: 'DESC' }, take: 500 });
    // Older receipts predate barcode support; return a deterministic barcode
    // for them too, without changing their original accounting data.
    return sales.map((sale) => ({ ...sale, receiptBarcode: sale.receiptBarcode ?? receiptEan13(Number(sale.receiptNumber)) }));
  }
  async addNote(saleId: string, input: { body?: string; imageUrl?: string }, actor: Actor) {
    const sale = await this.saleRepo.findOneBy({ id: saleId }); if (!sale) throw new NotFoundException('Sotuv topilmadi.');
    if (actor.role === UserRole.CASHIER && sale.cashierId !== actor.id) throw new BadRequestException('Boshqa kassir sotuviga izoh yozib bo‘lmaydi.');
    if (!input.body?.trim() && !input.imageUrl?.trim()) throw new BadRequestException('Izoh yoki rasm kiriting.');
    return this.noteRepo.save(this.noteRepo.create({ saleId, authorId: actor.id, body: input.body?.trim() ?? '', imageUrl: input.imageUrl?.trim() || null }));
  }
  async voidSale(id: string, reason: string, actorId: string) {
    if (!reason.trim()) throw new BadRequestException('Tuzatish sababini yozing.');
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(OfflineSale, { where: { id }, relations: { items: true } }); if (!sale) throw new NotFoundException('Sotuv topilmadi.');
      if (sale.isVoided) return sale;
      for (const item of sale.items) await manager.createQueryBuilder().update(ProductVariant).set({ offlineInventoryQuantity: () => `CAST(offline_inventory_quantity AS INTEGER) + ${item.quantity}` }).where('id = :id', { id: item.variantId }).execute();
      sale.isVoided = true; sale.voidReason = reason.trim(); return manager.save(sale);
    });
  }
  async saveReport(date: string, input: { cashAmount: number; cardAmount: number; transferAmount: number; expenseAmount: number; note?: string }, actor: Actor) {
    this.assertDate(date); const existing = await this.reportRepo.findOneBy({ cashierId: actor.id, reportDate: date });
    const values = { cashAmount: String(n(input.cashAmount)), cardAmount: String(n(input.cardAmount)), transferAmount: String(n(input.transferAmount)), expenseAmount: String(n(input.expenseAmount)), note: input.note?.trim() || null };
    return this.reportRepo.save(existing ? Object.assign(existing, values) : this.reportRepo.create({ ...values, clickAmount: '0', paymeAmount: '0' }));
  }
  async report(date: string, actor: Actor) {
    this.assertDate(date); const allSales = await this.saleRepo.find({ relations: { cashier: true, items: true }, order: { createdAt: 'DESC' } });
    const sales = allSales.filter((sale) => !sale.isVoided && dayKey(sale.createdAt) === date && (actor.role === UserRole.SUPER_ADMIN || sale.cashierId === actor.id));
    const reports = await this.reportRepo.find({ where: actor.role === UserRole.SUPER_ADMIN ? { reportDate: date } : { cashierId: actor.id, reportDate: date }, relations: { cashier: true } });
    const computerFor = (cashierId: string) => { const values = { cash: 0, card: 0, transfer: 0 }; sales.filter((sale) => sale.cashierId === cashierId).forEach((sale) => { const key = sale.paymentMethod === 'card' ? 'card' : sale.paymentMethod === 'cash' ? 'cash' : 'transfer'; values[key] += n(sale.totalAmount); }); return values; };
    if (actor.role !== UserRole.SUPER_ADMIN) return { canSeeComputerTotals: false, report: reports[0] ?? null, soldCount: sales.reduce((sum, sale) => sum + sale.items.reduce((count, item) => count + item.quantity, 0), 0) };
    const cashierIds = [...new Set([...sales.map((sale) => sale.cashierId), ...reports.map((report) => report.cashierId)])];
    const comparisons = cashierIds.map((cashierId) => { const report = reports.find((row) => row.cashierId === cashierId); const computer = computerFor(cashierId); const declared = { cash: n(report?.cashAmount), card: n(report?.cardAmount), transfer: n(report?.transferAmount) || n(report?.clickAmount) + n(report?.paymeAmount) }; const difference = Object.fromEntries(paymentKeys.map((key) => [key, declared[key] - computer[key]])); const totalDifference = Object.values(difference).reduce((sum, value) => sum + value, 0); const expense = n(report?.expenseAmount); const person = sales.find((sale) => sale.cashierId === cashierId)?.cashier ?? report?.cashier; return { cashierId, cashier: person ? { firstName: person.firstName, lastName: person.lastName, email: person.email } : null, report, computer, declared, difference, expense, totalDifference, isMismatch: !report || totalDifference !== 0 }; });
    return { canSeeComputerTotals: true, comparisons };
  }
  private inventoryRow(variant: ProductVariant) { const media = variant.product.media ?? []; return { id: variant.id, barcode: variant.barcode, sku: variant.sku, color: variant.color, size: variant.size, price: variant.price ?? variant.product.price, offlineInventoryQuantity: variant.offlineInventoryQuantity, product: { id: variant.product.id, title: variant.product.title, imageUrl: [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? null } }; }
  private assertDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf())) throw new BadRequestException('Sana YYYY-MM-DD ko‘rinishida bo‘lsin.'); }
}
