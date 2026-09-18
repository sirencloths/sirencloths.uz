import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomInt, randomUUID } from 'node:crypto';
import { AuditLog, Category, CollectionEntity, InventoryTransfer, OrderItem, Product, ProductDiscount, ProductGender, ProductStatus, ProductVariant, SiteSetting } from '../database/entities';

export type ProductInput = {
  slug: string; title: string; description?: string; status?: ProductStatus; price: string;
  compareAtPrice?: string | null; currencyCode?: string; categoryId?: string | null; gender?: ProductGender;
  media?: Array<{ url: string; alt?: string; position?: number }>; seo?: Record<string, unknown>; metadata?: Record<string, unknown>;
  scheduledAt?: Date | null; showLaunchCountdown?: boolean; launchCountdownText?: string | null;
};
export type VariantInput = { sku: string; name?: string; barcode?: string | null; color?: string | null; size?: string | null; price?: string | null; inventoryQuantity?: number; isActive?: boolean; attributes?: Record<string, unknown> };
export type TaxonomyInput = { slug: string; name: string; description?: string | null; imageUrl?: string | null; heroImageUrl?: string | null; position?: number; isVisible?: boolean };
export type DiscountInput = { productId: string; color?: string | null; size?: string | null; percent: number; endsAt?: string | null };

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ProductDiscount) private readonly discounts: Repository<ProductDiscount>,
    @InjectRepository(OrderItem) private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(InventoryTransfer) private readonly transfers: Repository<InventoryTransfer>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(CollectionEntity) private readonly collections: Repository<CollectionEntity>,
    @InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>,
    private readonly dataSource: DataSource,
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
    if (query.category) products = products.filter((product) => product.category?.slug === query.category);
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
    const [products, soldRows] = await Promise.all([
      this.products.find({ relations: { variants: true, category: true }, order: { updatedAt: 'DESC' } }),
      this.orderItems.createQueryBuilder('item')
        .innerJoin('item.order', 'order')
        .select('item.product_id', 'productId')
        .addSelect('COALESCE(SUM(item.quantity), 0)', 'soldQuantity')
        .where('order.payment_status = :paymentStatus', { paymentStatus: 'paid' })
        .andWhere('order.status NOT IN (:...excluded)', { excluded: ['cancelled', 'refunded'] })
        .groupBy('item.product_id')
        .getRawMany<{ productId: string; soldQuantity: string }>(),
    ]);
    const soldByProduct = new Map(soldRows.map((row) => [row.productId, Number(row.soldQuantity)]));
    await this.ensureVariantEan13(products);
    return products.map((product) => ({ ...product, soldQuantity: soldByProduct.get(product.id) ?? 0 }));
  }
  async createProduct(input: ProductInput) {
    await this.validateProductAssignment(input, true);
    const product = await this.products.save(this.products.create({ ...this.scheduleProduct(input), media: input.media ?? [], seo: input.seo ?? {}, metadata: input.metadata ?? {} }));
    if (product.status === ProductStatus.ACTIVE) await this.appendProductNotification(product);
    return product;
  }
  async updateProduct(id: string, input: Partial<ProductInput>) {
    await this.validateProductAssignment(input, false); const before = await this.products.findOneBy({ id });
    const product = await this.products.preload({ id, ...input });
    if (!product) throw new NotFoundException('Product not found');
    const saved = await this.products.save(this.scheduleProduct(product));
    if (saved.status === ProductStatus.ACTIVE && before?.status !== ProductStatus.ACTIVE) await this.appendProductNotification(saved);
    return saved;
  }
  async removeProduct(id: string) { await this.products.delete(id); return { deleted: true }; }

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
    await this.productOrFail(productId);
    const inventoryQuantity = input.inventoryQuantity ?? 0;
    const attributes = this.normalizedVariantAttributes(input.attributes);
    return this.variants.save(this.variants.create({ productId, ...input, barcode: await this.generateEan13(), name: input.name ?? '', inventoryQuantity, totalInventoryAdded: inventoryQuantity, isActive: input.isActive ?? true, attributes }));
  }
  async updateVariant(id: string, input: Partial<VariantInput>) {
    const { barcode: _barcode, ...changes } = input;
    const variant = await this.variants.preload({ id, ...changes, ...(changes.attributes ? { attributes: this.normalizedVariantAttributes(changes.attributes) } : {}) });
    if (!variant) throw new NotFoundException('Variant not found');
    return this.variants.save(variant);
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
    const imageUrl = [...(product.media ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.url ?? '';
    const item = {
      id: randomUUID(), kind: 'products',
      title: { ru: `Новый товар: ${product.title}`, uz: `Yangi mahsulot: ${product.title}`, en: `New product: ${product.title}` },
      text: { ru: 'Новый товар уже доступен в магазине.', uz: 'Yangi mahsulot endi do‘konda mavjud.', en: 'A new product is now available in the store.' },
      imageUrl, href: `/products/${product.slug}`, createdAt: new Date().toISOString(), isActive: true, clicks: 0, clickVisitorIds: [],
    };
    await this.settings.save(this.settings.create({ ...(setting ?? {}), key: 'site-notifications', value: { items: [item, ...items] } }));
  }

  private async moveInventory(items: Array<{ variantId: string; quantity: number }>, direction: 'to_offline' | 'to_online', actorId?: string, note?: string) {
    if (!items.length) throw new BadRequestException('Transfer uchun kamida bitta variant tanlang.');
    const merged = new Map<string, number>();
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!item.variantId || !Number.isInteger(quantity) || quantity < 1) throw new BadRequestException('Transfer miqdori musbat butun son bo‘lishi kerak.');
      merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + quantity);
    }
    return this.dataSource.transaction(async (manager) => {
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
  }

  async adminCategories() { const categories = await this.categories.find({ order: { position: 'ASC', name: 'ASC' } }); return Promise.all(categories.map(async (category) => ({ ...category, productCount: await this.products.count({ where: { categoryId: category.id } }) }))); }
  createCategory(input: TaxonomyInput) { return this.categories.save(this.categories.create({ slug: input.slug, name: input.name, description: input.description ?? null, imageUrl: input.imageUrl ?? null, position: input.position ?? 0, isVisible: input.isVisible ?? true })); }
  async updateCategory(id: string, input: Partial<TaxonomyInput>) { const entity = await this.categories.preload({ id, ...input }); if (!entity) throw new NotFoundException('Category not found'); return this.categories.save(entity); }
  async removeCategory(id: string) { const count = await this.products.count({ where: { categoryId: id } }); if (count) throw new BadRequestException(`Category contains ${count} products. Move products before deleting.`); await this.categories.delete(id); return { deleted: true }; }

  private csv(value?: string) { return (value ?? '').split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean); }
  private async validateProductAssignment(input: Partial<ProductInput>, required: boolean) { if (required && !input.categoryId) throw new BadRequestException('Please select a category.'); if (required && !input.gender) throw new BadRequestException('Please select a gender.'); if (input.categoryId && !(await this.categories.exists({ where: { id: input.categoryId } }))) throw new BadRequestException('Category not found.'); if (input.gender && !Object.values(ProductGender).includes(input.gender)) throw new BadRequestException('Invalid gender.'); }

  adminCollections() { return this.collections.find({ order: { position: 'ASC', name: 'ASC' } }); }
  createCollection(input: TaxonomyInput) { return this.collections.save(this.collections.create({ slug: input.slug, name: input.name, description: input.description ?? null, heroImageUrl: input.heroImageUrl ?? null, position: input.position ?? 0, isVisible: input.isVisible ?? true })); }
  async updateCollection(id: string, input: Partial<TaxonomyInput>) { const entity = await this.collections.preload({ id, ...input }); if (!entity) throw new NotFoundException('Collection not found'); return this.collections.save(entity); }
  async removeCollection(id: string) { await this.collections.delete(id); return { deleted: true }; }

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
