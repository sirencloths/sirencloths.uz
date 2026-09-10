import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { AuditLog, Category, CollectionEntity, InventoryTransfer, OrderItem, Product, ProductGender, ProductStatus, ProductVariant, SiteSetting } from '../database/entities';

export type ProductInput = {
  slug: string; title: string; description?: string; status?: ProductStatus; price: string;
  compareAtPrice?: string | null; currencyCode?: string; categoryId?: string | null; gender?: ProductGender;
  media?: Array<{ url: string; alt?: string; position?: number }>; seo?: Record<string, unknown>; metadata?: Record<string, unknown>;
};
export type VariantInput = { sku: string; name?: string; barcode?: string | null; color?: string | null; size?: string | null; price?: string | null; inventoryQuantity?: number; isActive?: boolean; attributes?: Record<string, unknown> };
export type TaxonomyInput = { slug: string; name: string; description?: string | null; imageUrl?: string | null; heroImageUrl?: string | null; position?: number; isVisible?: boolean };

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(OrderItem) private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(InventoryTransfer) private readonly transfers: Repository<InventoryTransfer>,
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(CollectionEntity) private readonly collections: Repository<CollectionEntity>,
    @InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>,
    private readonly dataSource: DataSource,
  ) {}

  publicProducts() { return this.products.find({ where: { status: ProductStatus.ACTIVE }, relations: { variants: true, category: true }, order: { createdAt: 'DESC' } }); }
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
    const product = await this.products.findOne({ where: { slug, status: ProductStatus.ACTIVE }, relations: { variants: true, category: true } });
    if (!product) throw new NotFoundException('Product not found');
    product.variants = product.variants.filter((variant) => variant.isActive);
    return product;
  }
  publicCategories() { return this.categories.find({ where: { isVisible: true }, order: { position: 'ASC', name: 'ASC' } }); }
  publicCollections() { return this.collections.find({ where: { isVisible: true }, order: { position: 'ASC', name: 'ASC' } }); }

  async adminProducts() {
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
    return products.map((product) => ({ ...product, soldQuantity: soldByProduct.get(product.id) ?? 0 }));
  }
  async createProduct(input: ProductInput) {
    await this.validateProductAssignment(input, true);
    const product = await this.products.save(this.products.create({ ...input, media: input.media ?? [], seo: input.seo ?? {}, metadata: input.metadata ?? {} }));
    if (product.status === ProductStatus.ACTIVE) await this.appendProductNotification(product);
    return product;
  }
  async updateProduct(id: string, input: Partial<ProductInput>) {
    await this.validateProductAssignment(input, false); const product = await this.products.preload({ id, ...input });
    if (!product) throw new NotFoundException('Product not found');
    return this.products.save(product);
  }
  async removeProduct(id: string) { await this.products.delete(id); return { deleted: true }; }

  variantsFor(productId: string) { return this.variants.find({ where: { productId }, order: { sku: 'ASC' } }); }
  async createVariant(productId: string, input: VariantInput) {
    await this.productOrFail(productId);
    const inventoryQuantity = input.inventoryQuantity ?? 0;
    const attributes = this.normalizedVariantAttributes(input.attributes);
    return this.variants.save(this.variants.create({ productId, ...input, name: input.name ?? '', inventoryQuantity, totalInventoryAdded: inventoryQuantity, isActive: input.isActive ?? true, attributes }));
  }
  async updateVariant(id: string, input: Partial<VariantInput>) {
    const variant = await this.variants.preload({ id, ...input, ...(input.attributes ? { attributes: this.normalizedVariantAttributes(input.attributes) } : {}) });
    if (!variant) throw new NotFoundException('Variant not found');
    return this.variants.save(variant);
  }
  async removeVariant(id: string) { await this.variants.delete(id); return { deleted: true }; }

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
  private normalizedVariantAttributes(attributes: Record<string, unknown> | undefined) {
    const next = { ...(attributes ?? {}) };
    if (Array.isArray(next.images)) {
      next.images = [...new Set(next.images.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))];
    }
    return next;
  }
}
