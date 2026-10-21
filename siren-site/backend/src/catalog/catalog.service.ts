import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomInt, randomUUID } from 'node:crypto';
import { AuditLog, Category, CollectionEntity, InventoryTransfer, OrderItem, Product, ProductDiscount, ProductEngagement, ProductGender, ProductStatus, ProductVariant, SiteSetting } from '../database/entities';
import { TelegramService } from '../telegram/telegram.service';

export type ProductInput = {
  slug: string; title: string; description?: string; status?: ProductStatus; price: string;
  compareAtPrice?: string | null; currencyCode?: string; categoryId?: string | null; gender?: ProductGender;
  media?: Array<{ url: string; alt?: string; position?: number }>; seo?: Record<string, unknown>; metadata?: Record<string, unknown>;
  scheduledAt?: Date | null; showLaunchCountdown?: boolean; launchCountdownText?: string | null;
};
export type VariantInput = { sku: string; name?: string; barcode?: string | null; color?: string | null; size?: string | null; price?: string | null; inventoryQuantity?: number; totalInventoryAdded?: number; isActive?: boolean; attributes?: Record<string, unknown> };
export type TaxonomyInput = { slug: string; name: string; translations?: Record<string, string>; description?: string | null; imageUrl?: string | null; heroImageUrl?: string | null; seo?: Record<string, unknown>; position?: number; isVisible?: boolean };
export type DiscountInput = { productId: string; color?: string | null; size?: string | null; percent: number; endsAt?: string | null };

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ProductDiscount) private readonly discounts: Repository<ProductDiscount>,
    @InjectRepository(ProductEngagement) private readonly engagements: Repository<ProductEngagement>,
    @InjectRepository(OrderItem) private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(InventoryTransfer) private readonly transfers: Repository<InventoryTransfer>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(CollectionEntity) private readonly collections: Repository<CollectionEntity>,
    @InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>,
    private readonly dataSource: DataSource,
    private readonly telegram: TelegramService,
  ) {}

  /** Keeps fiscal codes sourced from the National Catalog instead of local guesses. */
  async searchFiscalIkpu(query: string) {
    const term = query.trim();
    if (term.length < 2) throw new BadRequestException('IKPU qidiruvi kamida 2 ta belgi bo‘lishi kerak');
    const response = await this.tasnifRequest('/mxik/search/by-params', { text: term, size: '20', lang: 'uz_latn' });
    const searchData = response.data as { content?: unknown[] } | undefined;
    const content = Array.isArray(searchData?.content) ? searchData.content : [];
    return content.map((raw) => {
      const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      return {
        code: String(item.mxikCode ?? ''),
        name: String(item.mxikName ?? item.subPositionName ?? item.positionName ?? ''),
        category: [item.groupName, item.className].filter(Boolean).map(String).join(' · '),
      };
    }).filter((item: { code: string }) => Boolean(item.code));
  }

  async fiscalIkpuDetails(code: string) {
    const normalized = code.trim();
    if (!/^\d{8,20}$/.test(normalized)) throw new BadRequestException('IKPU kodi noto‘g‘ri');
    const item = await this.tasnifRequest('/mxik/get/by-mxik', { mxikCode: normalized, lang: 'uz_latn' });
    return {
      code: String(item.mxikCode ?? normalized),
      name: String(item.mxikName ?? item.subPositionName ?? item.positionName ?? ''),
      category: [item.groupName, item.className].filter(Boolean).map(String).join(' · '),
      packages: (Array.isArray(item.packages) ? item.packages : []).map((pkg: Record<string, unknown>) => ({
        code: String(pkg.code ?? ''),
        label: [pkg.containerName, pkg.name].filter(Boolean).map(String).join(' — '),
        unitCode: pkg.unitId == null ? '' : String(pkg.unitId),
        unitName: String(pkg.unitName ?? ''),
      })).filter((pkg: { code: string }) => Boolean(pkg.code)),
    };
  }

  private async tasnifRequest(path: string, params: Record<string, string>) {
    const url = new URL(`https://tasnif.soliq.uz/api/cls-api${path}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new BadRequestException('Rasmiy IKPU katalogiga ulanib bo‘lmadi');
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Rasmiy IKPU katalogi hozir javob bermayapti. Keyinroq qayta urinib ko‘ring.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async publicProducts() {
    await this.activateDueProducts();
    const products = await this.products.find({ where: { status: ProductStatus.ACTIVE }, relations: { variants: true, category: true }, order: { createdAt: 'DESC' } });
    const discounted = await this.applyDiscounts(await this.ensureVariantEan13(products));
    // This endpoint also drives the home page and search, so sale-first order
    // must live here rather than only in the listing endpoint.
    return discounted.sort((left, right) => {
      const leftDiscounted = left.variants.some((variant) => Boolean((variant as unknown as { discountPercent?: number }).discountPercent));
      const rightDiscounted = right.variants.some((variant) => Boolean((variant as unknown as { discountPercent?: number }).discountPercent));
      return Number(rightDiscounted) - Number(leftDiscounted);
    });
  }
  async publicListing(query: { category?: string; gender?: string; colors?: string; sizes?: string; minPrice?: string; maxPrice?: string; sort?: string }) {
    const genders = this.csv(query.gender); const colors = this.csv(query.colors); const sizes = this.csv(query.sizes);
    if (genders.some((value) => !Object.values(ProductGender).includes(value as ProductGender))) throw new BadRequestException('Invalid gender filter');
    const minPrice = query.minPrice === undefined ? null : Number(query.minPrice); const maxPrice = query.maxPrice === undefined ? null : Number(query.maxPrice);
    if ((minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) || (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) || (minPrice !== null && maxPrice !== null && minPrice > maxPrice)) throw new BadRequestException('Invalid price range');
    if (query.sort && !['recommended', 'newest', 'price-asc', 'price-desc', 'best-selling'].includes(query.sort)) throw new BadRequestException('Invalid sort');
    let products = await this.publicProducts();
    if (query.category) {
      const category = await this.categories.findOne({ where: { slug: query.category } });
      products = category ? products.filter((product) => this.categoryIdsFor(product).includes(category.id)) : [];
    }
    if (genders.length) products = products.filter((product) => genders.includes(product.gender));
    products = products.map((product) => ({ ...product, variants: product.variants.filter((variant) => variant.isActive && variant.inventoryQuantity > 0) })).filter((product) => product.variants.length);
    if (colors.length) products = products.map((product) => ({ ...product, variants: product.variants.filter((variant) => colors.includes((variant.color || 'default').toLowerCase())) })).filter((product) => product.variants.length);
    if (sizes.length) products = products.map((product) => ({ ...product, variants: product.variants.filter((variant) => sizes.includes((variant.size || '').toLowerCase())) })).filter((product) => product.variants.length);
    const effective = (product: Product) => Math.min(...product.variants.map((variant) => Number(variant.price ?? product.price)).filter(Number.isFinite));
    if (minPrice !== null) products = products.filter((product) => effective(product) >= minPrice);
    if (maxPrice !== null) products = products.filter((product) => effective(product) <= maxPrice);
    if (query.sort === 'price-asc') products.sort((a, b) => effective(a) - effective(b) || a.slug.localeCompare(b.slug));
    if (query.sort === 'price-desc') products.sort((a, b) => effective(b) - effective(a) || a.slug.localeCompare(b.slug));
    if (query.sort === 'newest') products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const facetSource = products;
    const count = (values: string[]) => [...new Set(values.filter(Boolean))].sort().map((value) => ({ value, count: values.filter((entry) => entry === value).length }));
    const prices = facetSource.map(effective).filter(Number.isFinite);
    return { products, total: products.reduce((sum, product) => sum + new Set(product.variants.map((variant) => (variant.color || 'Default').toLowerCase())).size, 0), facets: { genders: count(facetSource.map((product) => product.gender)), colors: count(facetSource.flatMap((product) => product.variants.map((variant) => (variant.color || 'Default').toLowerCase()))), sizes: count(facetSource.flatMap((product) => product.variants.map((variant) => (variant.size || '').toLowerCase()))), price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 } } };
  }
  async publicRandomProducts(limit = 4) {
    const products = await this.publicProducts();
    const take = Math.max(1, Math.min(12, Number.isFinite(limit) ? Math.floor(limit) : 4));
    // Shuffle in application code so it behaves identically on PostgreSQL and pg-mem.
    for (let index = products.length - 1; index > 0; index -= 1) {
      const selected = Math.floor(Math.random() * (index + 1));
      [products[index], products[selected]] = [products[selected], products[index]];
    }
    return products.slice(0, take);
  }
  async publicProduct(slug: string) {
    await this.activateDueProducts();
    const product = await this.products.findOne({ where: { slug, status: ProductStatus.ACTIVE }, relations: { variants: true, category: true } });
    if (!product) throw new NotFoundException('Product not found');
    await this.ensureVariantEan13([product]);
    product.variants = product.variants.filter((variant) => variant.isActive);
    return (await this.applyDiscounts([product]))[0];
  }
  publicCategories() { return this.categories.find({ where: { isVisible: true }, order: { position: 'ASC', name: 'ASC' } }); }
  publicCollections() { return this.collections.find({ where: { isVisible: true }, order: { position: 'ASC', name: 'ASC' } }); }

  async adminProducts() {
    await this.activateDueProducts();
    const [products, soldRows, variantSoldRows, engagementRows] = await Promise.all([
      this.products.find({ relations: { variants: true, category: true }, order: { updatedAt: 'DESC' } }),
      this.orderItems.createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('item.product_id', 'productId')
        .addSelect('COALESCE(SUM(item.quantity), 0)', 'soldQuantity')
        // Checkout reserves stock immediately.  The inventory screen must
        // therefore include accepted/reserved units, not only paid orders.
        .where('order.status NOT IN (:...excluded)', { excluded: ['cancelled', 'refunded'] })
        .groupBy('item.product_id')
        .getRawMany<{ productId: string; soldQuantity: string }>(),
      this.orderItems.createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('item.variant_id', 'variantId')
        .addSelect('COALESCE(SUM(item.quantity), 0)', 'soldQuantity')
        .where('item.variant_id IS NOT NULL')
        .andWhere('order.status NOT IN (:...excluded)', { excluded: ['cancelled', 'refunded'] })
        .groupBy('item.variant_id')
        .getRawMany<{ variantId: string; soldQuantity: string }>(),
      this.engagements.createQueryBuilder('engagement')
        .select('engagement.product_id', 'productId')
        .addSelect('engagement.kind', 'kind')
        .addSelect('COUNT(*)', 'count')
        .where('engagement.active = true')
        .groupBy('engagement.product_id')
        .addGroupBy('engagement.kind')
        .getRawMany<{ productId: string; kind: 'favorite' | 'cart'; count: string }>(),
    ]);
    const soldByProduct = new Map(soldRows.map((row) => [row.productId, Number(row.soldQuantity)]));
    const soldByVariant = new Map(variantSoldRows.map((row) => [row.variantId, Number(row.soldQuantity)]));
    const engagementByProduct = new Map<string, { favoriteCount: number; cartAddCount: number }>();
    engagementRows.forEach((row) => {
      const current = engagementByProduct.get(row.productId) ?? { favoriteCount: 0, cartAddCount: 0 };
      if (row.kind === 'favorite') current.favoriteCount = Number(row.count);
      if (row.kind === 'cart') current.cartAddCount = Number(row.count);
      engagementByProduct.set(row.productId, current);
    });
    await this.ensureVariantEan13(products);
    return products.map((product) => {
      // Cost and expense are entered once per colour in the product editor.
      // Older products may have those fields on only one size row; inherit
      // that known value for the other sizes instead of showing false 0 UZS.
      const financeByColor = new Map<string, { costPrice?: unknown; expensePrice?: unknown }>();
      product.variants.forEach((variant) => {
        const key = (variant.color ?? '').trim().toLowerCase();
        const current = financeByColor.get(key) ?? {};
        const costPrice = variant.attributes?.costPrice;
        const expensePrice = variant.attributes?.expensePrice;
        if (Number(costPrice) > 0 && current.costPrice === undefined) current.costPrice = costPrice;
        if (Number(expensePrice) > 0 && current.expensePrice === undefined) current.expensePrice = expensePrice;
        financeByColor.set(key, current);
      });
      return {
        ...product,
        variants: product.variants.map((variant) => {
          const fallback = financeByColor.get((variant.color ?? '').trim().toLowerCase()) ?? {};
          const attributes = { ...(variant.attributes ?? {}) };
          if (!(Number(attributes.costPrice) > 0) && fallback.costPrice !== undefined) attributes.costPrice = fallback.costPrice;
          if (!(Number(attributes.expensePrice) > 0) && fallback.expensePrice !== undefined) attributes.expensePrice = fallback.expensePrice;
          return { ...variant, attributes, soldQuantity: soldByVariant.get(variant.id) ?? 0 };
        }),
        soldQuantity: soldByProduct.get(product.id) ?? 0,
        ...(engagementByProduct.get(product.id) ?? { favoriteCount: 0, cartAddCount: 0 }),
      };
    });
  }

  async trackEngagement(productId: string, kind: 'favorite' | 'cart', visitorId: string, active = true) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    const existing = await this.engagements.findOne({ where: { productId, kind, visitorId } });
    if (existing) {
      existing.active = kind === 'favorite' ? active : true;
      await this.engagements.save(existing);
    } else {
      await this.engagements.save(this.engagements.create({ productId, kind, visitorId, active: kind === 'favorite' ? active : true }));
    }
    return { ok: true };
  }
  async trackProductView(productId: string) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    const metadata = { ...(product.metadata ?? {}) };
    metadata.views = Math.max(0, Number(metadata.views ?? 0)) + 1;
    await this.products.save({ ...product, metadata });
    return { ok: true, views: metadata.views };
  }
  async createProduct(input: ProductInput) {
    await this.validateProductAssignment(input, true);
    const product = await this.products.save(this.products.create({ ...this.scheduleProduct(input), media: input.media ?? [], seo: input.seo ?? {}, metadata: input.metadata ?? {} }));
    if (product.status === ProductStatus.ACTIVE) await this.appendProductNotification(product);
    void this.telegram.controlPhoto(this.productImage(product), `🛍️ YANGI MAHSULOT QO‘SHILDI\n\n🏷️ Nomi: ${product.title}\n💳 Narx: ${Number(product.price).toLocaleString('en-US')} ${product.currencyCode}\n🟢 Status: ${product.status}\n🔗 Havola: /products/${product.slug}\n\n🕒 Vaqt: ${new Intl.DateTimeFormat('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`);
    return product;
  }
  async updateProduct(id: string, input: Partial<ProductInput>) {
    await this.validateProductAssignment(input, false); const before = await this.products.findOneBy({ id });
    const product = await this.products.preload({ id, ...input });
    if (!product) throw new NotFoundException('Product not found');
    const saved = await this.products.save(this.scheduleProduct(product));
    if (saved.status === ProductStatus.ACTIVE && before?.status !== ProductStatus.ACTIVE) await this.appendProductNotification(saved);
    const changes = [before?.title !== saved.title ? `🏷️ Nomi: ${before?.title || '—'} → ${saved.title}` : '', before?.price !== saved.price ? `💳 Narx: ${Number(before?.price ?? 0).toLocaleString('en-US')} ${saved.currencyCode} → ${Number(saved.price).toLocaleString('en-US')} ${saved.currencyCode}` : '', before?.status !== saved.status ? `🔄 Status: ${before?.status || '—'} → ${saved.status}` : '', JSON.stringify(before?.media ?? []) !== JSON.stringify(saved.media ?? []) ? '🖼️ Mahsulot rasmi: yangilandi' : ''].filter(Boolean);
    void this.telegram.controlPhoto(this.productImage(saved), `🛍️ MAHSULOT YANGILANDI\n\n🏷️ Nomi: ${saved.title}\n🟢 Status: ${saved.status}\n🔗 Havola: /products/${saved.slug}${changes.length ? `\n\n📝 O‘zgarishlar:\n${changes.map((item) => `• ${item}`).join('\n')}` : ''}\n\n🕒 Vaqt: ${new Intl.DateTimeFormat('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`);
    return saved;
  }
  async removeProduct(id: string) { await this.products.delete(id); return { deleted: true }; }

  private productImage(product: Pick<Product, 'media'>) { return product.media?.slice().sort((left, right) => (left.position ?? 0) - (right.position ?? 0))[0]?.url; }

  private scheduleProduct<T extends { status?: ProductStatus; scheduledAt?: Date | null }>(product: T): T & { status: ProductStatus; scheduledAt: Date | null } {
    const scheduledAt = product.scheduledAt ? new Date(product.scheduledAt) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Rejalashtirilgan vaqt noto‘g‘ri.');
    // A future launch can never leak into catalog reads as an active product.
    if (scheduledAt && scheduledAt.getTime() > Date.now()) return { ...product, status: ProductStatus.DRAFT, scheduledAt };
    // A schedule that is already due becomes active immediately.
    if (scheduledAt && (product.status ?? ProductStatus.DRAFT) === ProductStatus.DRAFT) return { ...product, status: ProductStatus.ACTIVE, scheduledAt };
    return { ...product, status: product.status ?? ProductStatus.DRAFT, scheduledAt };
  }

  private async activateDueProducts() {
    const due = await this.products.createQueryBuilder('product')
      .where('product.status = :draft', { draft: ProductStatus.DRAFT })
      .andWhere('product.scheduled_at IS NOT NULL AND product.scheduled_at <= NOW()')
      .getMany();
    for (const product of due) {
      // The guarded update makes the launch idempotent if two storefront
      // requests arrive at the same second: only the request that activated
      // the product is allowed to create its customer notification.
      const result = await this.products.createQueryBuilder().update(Product).set({ status: ProductStatus.ACTIVE })
        .where('id = :id AND status = :draft', { id: product.id, draft: ProductStatus.DRAFT }).execute();
      if (result.affected) await this.appendProductNotification(product);
    }
  }

  variantsFor(productId: string) { return this.variants.find({ where: { productId }, order: { sku: 'ASC' } }); }
  async createVariant(productId: string, input: VariantInput) {
    const product = await this.productOrFail(productId);
    const inventoryQuantity = input.inventoryQuantity ?? 0;
    const totalInventoryAdded = input.totalInventoryAdded ?? inventoryQuantity;
    if (!Number.isInteger(inventoryQuantity) || !Number.isInteger(totalInventoryAdded) || inventoryQuantity < 0 || totalInventoryAdded < 0) throw new BadRequestException('Variant miqdori manfiy bo‘lmagan butun son bo‘lishi kerak.');
    if (totalInventoryAdded !== inventoryQuantity) throw new BadRequestException('Yangi variantda yaratilgan miqdor va ombor miqdori bir xil bo‘lishi kerak.');
    await this.assertAllocationWithinProduct(product, totalInventoryAdded);
    const attributes = this.normalizedVariantAttributes(input.attributes);
    const { totalInventoryAdded: _totalInventoryAdded, ...variantInput } = input;
    const saved = await this.variants.save(this.variants.create({ productId, ...variantInput, barcode: await this.generateEan13(), name: input.name ?? '', inventoryQuantity, totalInventoryAdded, isActive: input.isActive ?? true, attributes }));
    void this.telegram.control(`#QOLDIQ\n\n➕ YANGI VARIANT QO‘SHILDI\n\nSKU: ${saved.sku}\nOnline qoldiq: ${saved.inventoryQuantity} ta`);
    return saved;
  }
  async updateVariant(id: string, input: Partial<VariantInput>) {
    const current = await this.variants.findOneBy({ id });
    if (!current) throw new NotFoundException('Variant not found');
    const product = await this.productOrFail(current.productId);
    const { barcode: _barcode, totalInventoryAdded: requestedAllocation, ...changes } = input;
    const currentAllocation = this.variantAllocation(current);
    // Admin edits use the immutable "created total" allocation. Translate
    // its difference to the live online balance so past sales/transfers stay
    // intact instead of being overwritten.
    const nextAllocation = requestedAllocation === undefined
      ? currentAllocation + ((changes.inventoryQuantity ?? current.inventoryQuantity) - current.inventoryQuantity)
      : requestedAllocation;
    if (!Number.isInteger(nextAllocation) || nextAllocation < 0) throw new BadRequestException('Yaratilgan miqdor manfiy bo‘lmagan butun son bo‘lishi kerak.');
    const nextOnline = current.inventoryQuantity + (nextAllocation - currentAllocation);
    if (nextOnline < 0) throw new BadRequestException('Bu miqdor sotilgan yoki offlinega ajratilgan mavjud mahsulotdan past bo‘la olmaydi.');
    await this.assertAllocationWithinProduct(product, nextAllocation, current.id);
    const variant = await this.variants.preload({ id, ...changes, inventoryQuantity: nextOnline, totalInventoryAdded: nextAllocation, ...(changes.attributes ? { attributes: this.normalizedVariantAttributes(changes.attributes) } : {}) });
    if (!variant) throw new NotFoundException('Variant not found');
    const saved = await this.variants.save(variant);
    void this.telegram.control(`#QOLDIQ\n\n🔄 VARIANT O‘ZGARDI\n\nSKU: ${saved.sku}\nOnline qoldiq: ${current.inventoryQuantity} ta → ${saved.inventoryQuantity} ta`);
    return saved;
  }
  async removeVariant(id: string) { await this.variants.delete(id); return { deleted: true }; }

  async listDiscounts() {
    const discounts = await this.discounts.find({ relations: { product: { variants: true } }, order: { isActive: 'DESC', createdAt: 'DESC' } });
    return Promise.all(discounts.map(async (discount) => {
      const matchingVariants = discount.product?.variants?.filter((variant) => (!discount.color || variant.color === discount.color) && (!discount.size || variant.size === discount.size)) ?? [];
      const amounts = matchingVariants.map((variant) => Number(variant.price ?? discount.product.price)).filter((amount) => Number.isFinite(amount) && amount > 0);
      if (amounts.length && discount.product) discount.product.price = String(Math.min(...amounts));
      const sales = await this.orderItems.createQueryBuilder('item').innerJoin('item.order', 'order').select('COALESCE(SUM(item.quantity), 0)', 'quantity').where('item.product_id = :productId', { productId: discount.productId }).andWhere('order.payment_status = :paymentStatus', { paymentStatus: 'paid' }).andWhere(matchingVariants.length ? 'item.variant_id IN (:...variantIds)' : '1=1', { variantIds: matchingVariants.map((variant) => variant.id) }).getRawOne<{ quantity: string }>();
      return { ...discount, discountSoldQuantity: Number(sales?.quantity || 0) };
    }));
  }
  async createDiscount(input: DiscountInput, actorId?: string) {
    const product = await this.productOrFail(input.productId);
    const color = input.color?.trim() || null, size = input.size?.trim() || null;
    const percent = Math.round(Number(input.percent));
    const endsAt = input.endsAt?.trim() ? new Date(input.endsAt) : null;
    if (!Number.isInteger(percent) || percent < 1 || percent > 99) throw new BadRequestException('Chegirma foizi 1 dan 99 gacha bo‘lishi kerak.');
    if (endsAt && (Number.isNaN(endsAt.valueOf()) || endsAt <= new Date())) throw new BadRequestException('Aksiya tugash vaqti kelajakda bo‘lishi kerak.');
    const variants = await this.variants.find({ where: { productId: product.id } });
    const matches = variants.filter((variant) => (!color || variant.color === color) && (!size || variant.size === size));
    if (!matches.length) throw new BadRequestException('Tanlangan SKU, rang yoki razmer uchun variant topilmadi.');
    const discount = await this.discounts.save(this.discounts.create({ productId: product.id, color, size, percent, endsAt, isActive: true }));
    await this.auditLogs.save(this.auditLogs.create({ actorId: actorId ?? null, action: 'created', entityType: 'product_discount', entityId: discount.id, payload: { productId: product.id, color, size, percent, endsAt: endsAt?.toISOString() ?? null } }));
    void this.telegram.control(`#AKSIYA\n\n🏷 AKSIYA YOQILDI\n\n${product.title}\nChegirma: ${percent}%\nTugaydi: ${endsAt ? endsAt.toLocaleString('uz-UZ') : 'Muddatsiz'}`);
    return discount;
  }
  async removeDiscount(id: string, actorId?: string) { const discount = await this.discounts.findOneBy({ id }); if (!discount) throw new NotFoundException('Chegirma topilmadi.'); await this.discounts.delete(id); await this.auditLogs.save(this.auditLogs.create({ actorId: actorId ?? null, action: 'deleted', entityType: 'product_discount', entityId: id, payload: {} })); return { deleted: true }; }
  async setDiscountActive(id: string, isActive: boolean, actorId?: string) {
    const discount = await this.discounts.preload({ id, isActive });
    if (!discount) throw new NotFoundException('Chegirma topilmadi.');
    const saved = await this.discounts.save(discount);
    await this.auditLogs.save(this.auditLogs.create({ actorId: actorId ?? null, action: isActive ? 'activated' : 'deactivated', entityType: 'product_discount', entityId: id, payload: { isActive } }));
    return saved;
  }

  async transferHistory() {
    return this.transfers.find({
      relations: { product: true, variant: true },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  async transferToOffline(items: Array<{ variantId: string; quantity: number }>, actorId?: string, note?: string) {
    return this.moveInventory(items, 'to_offline', actorId, note);
  }

  async returnToOnline(items: Array<{ variantId: string; quantity: number }>, actorId?: string, note?: string) {
    return this.moveInventory(items, 'to_online', actorId, note);
  }

  private async appendProductNotification(product: Product) {
    const setting = await this.settings.findOneBy({ key: 'site-notifications' });
    const items = Array.isArray(setting?.value?.items) ? setting.value.items : [];
    const productWithMedia = product.media?.length ? product : await this.products.findOne({ where: { id: product.id }, relations: { variants: true } }) ?? product;
    const imageUrl = [...(productWithMedia.media ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? productWithMedia.variants?.flatMap((variant) => Array.isArray(variant.attributes?.images) ? variant.attributes.images : []).find((url): url is string => typeof url === 'string' && Boolean(url.trim())) ?? '';
    const item = {
      id: randomUUID(), kind: 'products',
      title: { ru: `Новый товар: ${product.title}`, uz: `Yangi mahsulot: ${product.title}`, en: `New product: ${product.title}` },
      text: { ru: 'Новый товар уже доступен в магазине.', uz: 'Yangi mahsulot endi do‘konda mavjud.', en: 'A new product is now available in the store.' },
      imageUrl, href: `/products/${product.slug}`, createdAt: new Date().toISOString(), isActive: true, clicks: 0, clickVisitorIds: [],
    };
    await this.settings.save(this.settings.create({ ...(setting ?? {}), key: 'site-notifications', value: { items: [item, ...items] } }));
  }

  /** Adds new physical units without overwriting stock already reduced by sales or transfers. */
  async restockProduct(productId: string, items: Array<{ variantId: string; quantity: number }>, actorId?: string, note?: string) {
    if (!items.length) throw new BadRequestException('Qayta stock uchun kamida bitta variant tanlang.');
    const merged = new Map<string, number>();
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.variantId || !Number.isInteger(quantity) || quantity < 1) throw new BadRequestException('Qayta stock miqdori musbat butun son bo‘lishi kerak.');
      merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + quantity);
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { where: { id: productId } });
      if (!product) throw new NotFoundException('Mahsulot topilmadi.');
      // Some older products predate baseInventoryQuantity. In that case use
      // their existing SKU allocations as the floor before adding a restock.
      const existingVariants = await manager.find(ProductVariant, { where: { productId } });
      const existingAllocated = existingVariants.reduce((sum, variant) => sum + this.variantAllocation(variant), 0);
      const changed: Array<{ variant: ProductVariant; quantity: number }> = [];
      for (const [variantId, quantity] of merged) {
        const variant = await manager.findOne(ProductVariant, { where: { id: variantId, productId } });
        if (!variant) throw new BadRequestException('Variant tanlangan mahsulotga tegishli emas.');
        if (!variant.isActive) throw new BadRequestException(`${variant.sku} faol emas; avval variantni yoqing.`);
        await manager.createQueryBuilder().update(ProductVariant).set({
          inventoryQuantity: () => `CAST(inventory_quantity AS INTEGER) + ${quantity}`,
          totalInventoryAdded: () => `CAST(total_inventory_added AS INTEGER) + ${quantity}`,
        }).where('id = :variantId', { variantId }).execute();
        changed.push({ variant, quantity });
        await manager.insert(AuditLog, {
          id: randomUUID(), actorId: actorId ?? null, action: 'inventory_restock', entityType: 'product_variant', entityId: variant.id,
          payload: { productId, variantId: variant.id, sku: variant.sku, color: variant.color ?? undefined, size: variant.size ?? undefined, quantity, note: note?.trim() || undefined },
        });
      }
      const addedUnits = changed.reduce((sum, item) => sum + item.quantity, 0);
      const currentBase = Number(product.metadata?.baseInventoryQuantity);
      const baseBeforeRestock = Math.max(existingAllocated, Number.isFinite(currentBase) && currentBase >= 0 ? currentBase : 0);
      product.metadata = { ...(product.metadata ?? {}), baseInventoryQuantity: baseBeforeRestock + addedUnits };
      await manager.save(product);
      return { restockedUnits: addedUnits, restockedVariants: changed.length };
    });
    void this.telegram.control(`#QOLDIQ\n\n➕ QAYTA STOCK\n\nMahsulot: ${productId}\nMiqdor: ${result.restockedUnits} ta\nVariantlar: ${result.restockedVariants} ta`);
    return result;
  }

  private async moveInventory(items: Array<{ variantId: string; quantity: number }>, direction: 'to_offline' | 'to_online', actorId?: string, note?: string) {
    if (!items.length) throw new BadRequestException('Transfer uchun kamida bitta variant tanlang.');
    const merged = new Map<string, number>();
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.variantId || !Number.isInteger(quantity) || quantity < 1) throw new BadRequestException('Transfer miqdori musbat butun son bo‘lishi kerak.');
      merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + quantity);
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const changed: Array<{ variant: ProductVariant; quantity: number }> = [];
      for (const [variantId, quantity] of merged) {
        const variant = await manager.findOne(ProductVariant, { where: { id: variantId } });
        if (!variant) throw new NotFoundException('Variant topilmadi yoki o‘chirilgan.');
        if (!variant.isActive) throw new BadRequestException(`${variant.sku} faol emas.`);
        const available = direction === 'to_offline' ? variant.inventoryQuantity : variant.offlineInventoryQuantity;
        if (available < quantity) throw new BadRequestException(`Stock changed. ${variant.sku} uchun mavjud miqdor hozir ${available}.`);

        // Conditional update prevents a stale browser from taking more units than are left.
        const balanceColumn = direction === 'to_offline' ? 'inventory_quantity' : 'offline_inventory_quantity';
        // Explicit casts keep the operation numeric both in PostgreSQL and in
        // the local pg-mem development adapter, whose generated defaults can
        // otherwise arrive as strings.
        const online = 'CAST(inventory_quantity AS INTEGER)';
        const offline = 'CAST(offline_inventory_quantity AS INTEGER)';
        const result = await manager.createQueryBuilder()
          .update(ProductVariant)
          .set(direction === 'to_offline'
            ? { inventoryQuantity: () => `${online} - ${quantity}`, offlineInventoryQuantity: () => `${offline} + ${quantity}` }
            : { inventoryQuantity: () => `${online} + ${quantity}`, offlineInventoryQuantity: () => `${offline} - ${quantity}` })
          .where(`id = :variantId AND ${balanceColumn} >= :quantity`, { variantId, quantity })
          .execute();
        if (result.affected !== 1) throw new BadRequestException(`Stock changed. ${variant.sku} uchun mavjud miqdor yangilandi.`);
        changed.push({ variant, quantity });
        await manager.insert(InventoryTransfer, {
          id: randomUUID(),
          productId: variant.productId,
          variantId: variant.id,
          quantity,
          direction,
          fromLocation: direction === 'to_offline' ? 'online' : 'offline',
          toLocation: direction === 'to_offline' ? 'offline' : 'online',
          actorId: actorId ?? null,
          note: note?.trim() || null,
        });
        await manager.insert(AuditLog, {
          id: randomUUID(),
          actorId: actorId ?? null,
          action: direction === 'to_offline' ? 'inventory_transfer' : 'inventory_return',
          entityType: 'product_variant',
          entityId: variant.id,
          payload: { productId: variant.productId, variantId: variant.id, sku: variant.sku, color: variant.color ?? undefined, size: variant.size ?? undefined, quantity, from: direction === 'to_offline' ? 'online' : 'offline', to: direction === 'to_offline' ? 'offline' : 'online' },
        });
      }
      return { movedUnits: changed.reduce((sum, item) => sum + item.quantity, 0), movedVariants: changed.length };
    });
    void this.telegram.control(`#TRANSFER\n\n🔄 OMBOR TRANSFERI\n\nYo‘nalish: ${direction === 'to_offline' ? 'Online → Offline do‘kon' : 'Offline do‘kon → Online'}\nMiqdor: ${result.movedUnits} ta\nVariantlar: ${result.movedVariants} ta`);
    return result;
  }

  private categoryIdsFor(product: Pick<Product, 'categoryId' | 'metadata'>) {
    const stored = Array.isArray(product.metadata?.categoryIds) ? product.metadata.categoryIds.filter((id): id is string => typeof id === 'string') : [];
    return [...new Set([product.categoryId, ...stored].filter((id): id is string => Boolean(id)))];
  }

  async adminCategories() {
    const [categories, products] = await Promise.all([
      this.categories.find({ order: { position: 'ASC', name: 'ASC' } }),
      this.products.find({ select: { id: true, categoryId: true, metadata: true } }),
    ]);
    return categories.map((category) => ({ ...category, productCount: products.filter((product) => this.categoryIdsFor(product).includes(category.id)).length }));
  }
  async translateCategoryName(name: string) {
    const source = name.trim();
    if (!source) throw new BadRequestException('Tarjima uchun kategoriya nomini kiriting.');
    const translate = async (target: 'uz' | 'en' | 'ja') => {
      const url = new URL('https://translate.googleapis.com/translate_a/single');
      url.searchParams.set('client', 'gtx'); url.searchParams.set('sl', 'auto'); url.searchParams.set('tl', target); url.searchParams.set('dt', 't'); url.searchParams.set('q', source);
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Tarjima xizmati ${response.status} xatosini qaytardi.`);
      const payload = await response.json() as unknown;
      const rows = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
      const translated = rows.map((row) => Array.isArray(row) && typeof row[0] === 'string' ? row[0] : '').join('').trim();
      if (!translated) throw new Error('Tarjima javobi bo‘sh.');
      return translated;
    };
    try {
      const [uz, en, ja] = await Promise.all([translate('uz'), translate('en'), translate('ja')]);
      return { uz, en, ja };
    } catch {
      throw new BadRequestException('Avtomatik tarjima hozir ishlamayapti. Internet aloqasini tekshirib, qayta urinib ko‘ring.');
    }
  }
  createCategory(input: TaxonomyInput) { return this.categories.save(this.categories.create({ slug: input.slug, name: input.name, translations: input.translations ?? {}, description: input.description ?? null, imageUrl: input.imageUrl ?? null, seo: { title: input.name, description: input.description ?? '', image: input.imageUrl ?? '' }, position: input.position ?? 0, isVisible: input.isVisible ?? true })); }
  async updateCategory(id: string, input: Partial<TaxonomyInput>) { const entity = await this.categories.preload({ id, ...input }); if (!entity) throw new NotFoundException('Category not found'); entity.seo = { title: entity.name, description: entity.description ?? '', image: entity.imageUrl ?? '' }; return this.categories.save(entity); }
  async setProductCategoryMembership(productId: string, categoryId: string, assigned: boolean) {
    const [product, category] = await Promise.all([this.products.findOneBy({ id: productId }), this.categories.findOneBy({ id: categoryId })]);
    if (!product) throw new NotFoundException('Product not found');
    if (!category) throw new NotFoundException('Category not found');
    const categoryIds = this.categoryIdsFor(product);
    const nextIds = assigned ? [...new Set([...categoryIds, categoryId])] : categoryIds.filter((id) => id !== categoryId);
    product.metadata = { ...(product.metadata ?? {}), categoryIds: nextIds };
    if (!assigned && product.categoryId === categoryId) product.categoryId = null;
    await this.products.save(product);
    return { productId, categoryId, assigned, categoryIds: nextIds };
  }
  async addProductToAllCategories(productId: string) {
    const [product, categories] = await Promise.all([this.products.findOneBy({ id: productId }), this.categories.find()]);
    if (!product) throw new NotFoundException('Product not found');
    const categoryIds = [...new Set([...this.categoryIdsFor(product), ...categories.map((category) => category.id)])];
    product.metadata = { ...(product.metadata ?? {}), categoryIds };
    await this.products.save(product);
    return { productId, categoryIds };
  }
  async removeCategory(id: string) {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
    const products = await this.products.find();
    for (const product of products) {
      if (!this.categoryIdsFor(product).includes(id)) continue;
      product.metadata = { ...(product.metadata ?? {}), categoryIds: this.categoryIdsFor(product).filter((categoryId) => categoryId !== id) };
      if (product.categoryId === id) product.categoryId = null;
      await this.products.save(product);
    }
    await this.categories.delete(id);
    return { deleted: true };
  }

  private csv(value?: string) { return (value ?? '').split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean); }
  private async validateProductAssignment(input: Partial<ProductInput>, required: boolean) { if (required && !input.categoryId) throw new BadRequestException('Please select a category.'); if (required && !input.gender) throw new BadRequestException('Please select a gender.'); if (input.categoryId && !(await this.categories.exists({ where: { id: input.categoryId } }))) throw new BadRequestException('Category not found.'); if (input.gender && !Object.values(ProductGender).includes(input.gender)) throw new BadRequestException('Invalid gender.'); }

  adminCollections() { return this.collections.find({ order: { position: 'ASC', name: 'ASC' } }); }
  createCollection(input: TaxonomyInput) { return this.collections.save(this.collections.create({ slug: input.slug, name: input.name, description: input.description ?? null, heroImageUrl: input.heroImageUrl ?? null, position: input.position ?? 0, isVisible: input.isVisible ?? true })); }
  async updateCollection(id: string, input: Partial<TaxonomyInput>) { const entity = await this.collections.preload({ id, ...input }); if (!entity) throw new NotFoundException('Collection not found'); return this.collections.save(entity); }
  async removeCollection(id: string) { await this.collections.delete(id); return { deleted: true }; }

  private variantAllocation(variant: ProductVariant) {
    return Math.max(0, Number(variant.totalInventoryAdded ?? variant.inventoryQuantity) || 0);
  }
  private async assertAllocationWithinProduct(product: Product, nextAllocation: number, replacingVariantId?: string) {
    const cap = Number(product.metadata?.baseInventoryQuantity);
    // Older products may not yet have an explicit total. Do not invent a cap
    // for them; newly created/edited admin products always send this value.
    if (!Number.isFinite(cap) || cap < 0) return;
    const variants = await this.variants.find({ where: { productId: product.id } });
    const allocated = variants.reduce((sum, variant) => sum + (variant.id === replacingVariantId ? 0 : this.variantAllocation(variant)), 0);
    if (allocated + nextAllocation > cap) {
      throw new BadRequestException(`Variantlar jami ${allocated + nextAllocation} ta bo‘ladi. Mahsulot uchun yaratilgan limit ${cap} ta.`);
    }
  }
  private async productOrFail(id: string) { const product = await this.products.findOneBy({ id }); if (!product) throw new NotFoundException('Product not found'); return product; }
  private ean13CheckDigit(base: string) {
    const sum = base.split('').reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return String((10 - (sum % 10)) % 10);
  }
  private async generateEan13() {
    // 478 is the Uzbekistan GS1 prefix; nine random digits plus a calculated
    // checksum make a standards-compliant, system-unique EAN-13 number.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const base = `478${randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
      const ean13 = `${base}${this.ean13CheckDigit(base)}`;
      if (!(await this.variants.exists({ where: { barcode: ean13 } }))) return ean13;
    }
    throw new BadRequestException('Yangi EAN-13 kod yaratib bo‘lmadi. Qayta urinib ko‘ring.');
  }
  private isEan13(value: string | null | undefined) {
    if (!/^\d{13}$/.test(value ?? '')) return false;
    const base = value!.slice(0, 12);
    return this.ean13CheckDigit(base) === value!.slice(-1);
  }
  private async ensureVariantEan13(products: Product[]) {
    for (const product of products) {
      for (const variant of product.variants ?? []) {
        if (this.isEan13(variant.barcode)) continue;
        variant.barcode = await this.generateEan13();
        await this.variants.save(variant);
      }
    }
    return products;
  }
  private async applyDiscounts(products: Product[]) {
    const now = new Date(); const active = await this.discounts.find({ where: { isActive: true } });
    const valid = active.filter((discount) => !discount.endsAt || discount.endsAt > now);
    return products.map((product) => ({ ...product, variants: product.variants.map((variant) => {
      const matching = valid.filter((discount) => discount.productId === product.id && (!discount.color || discount.color === variant.color) && (!discount.size || discount.size === variant.size));
      const discount = matching.sort((left, right) => ((Number(Boolean(right.color)) + Number(Boolean(right.size))) - (Number(Boolean(left.color)) + Number(Boolean(left.size)))) || right.percent - left.percent)[0];
      if (!discount) return variant;
      const original = Number(variant.price ?? product.price);
      return { ...variant, price: String(Math.round(original * (100 - discount.percent) / 100)), originalPrice: String(original), discountPercent: discount.percent, discountEndsAt: discount.endsAt?.toISOString(), discountScope: discount.size ? 'size' : discount.color ? 'color' : 'product' };
    }) })) as Product[];
  }
  private normalizedVariantAttributes(attributes: Record<string, unknown> | undefined) {
    const next = { ...(attributes ?? {}) };
    if (Array.isArray(next.images)) {
      next.images = [...new Set(next.images.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))];
    }
    return next;
  }
}
