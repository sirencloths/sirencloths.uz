import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EDITOR = 'editor',
  FULFILLMENT = 'fulfillment',
  ANALYST = 'analyst',
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 255 }) email!: string;
  @Column({ name: 'password_hash', select: false }) passwordHash!: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.ADMIN }) role!: UserRole;
  @Column({ name: 'first_name', length: 100, default: '' }) firstName!: string;
  @Column({ name: 'last_name', length: 100, default: '' }) lastName!: string;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 180 }) slug!: string;
  @Column({ length: 180 }) name!: string;
  @Column({ type: 'varchar', nullable: true }) description!: string | null;
  @Column({ name: 'image_url', type: 'varchar', nullable: true }) imageUrl!: string | null;
  @Column({ type: 'int', default: 0 }) position!: number;
  @Column({ name: 'is_visible', default: true }) isVisible!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('collections')
export class CollectionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 180 }) slug!: string;
  @Column({ length: 180 }) name!: string;
  @Column({ type: 'varchar', nullable: true }) description!: string | null;
  @Column({ name: 'hero_image_url', type: 'varchar', nullable: true }) heroImageUrl!: string | null;
  @Column({ type: 'int', default: 0 }) position!: number;
  @Column({ name: 'is_visible', default: true }) isVisible!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 220 }) slug!: string;
  @Column({ length: 220 }) title!: string;
  @Column({ type: 'text', default: '' }) description!: string;
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT }) status!: ProductStatus;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 }) price!: string;
  @Column({ name: 'compare_at_price', type: 'numeric', precision: 12, scale: 2, nullable: true }) compareAtPrice!: string | null;
  @Column({ name: 'currency_code', length: 3, default: 'UZS' }) currencyCode!: string;
  @Column({ name: 'category_id', type: 'uuid', nullable: true }) categoryId!: string | null;
  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'category_id' }) category!: Category | null;
  @Column({ type: 'jsonb', default: () => "'[]'" }) media!: Array<{ url: string; alt?: string; position?: number }>;
  @Column({ type: 'jsonb', default: () => "'{}'" }) seo!: { title?: string; description?: string; keywords?: string[] };
  @Column({ type: 'jsonb', default: () => "'{}'" }) metadata!: Record<string, unknown>;
  @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: true }) variants!: ProductVariant[];
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('product_variants')
@Index(['productId', 'sku'], { unique: true })
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'product_id', type: 'uuid' }) productId!: string;
  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'product_id' }) product!: Product;
  @Column({ length: 120 }) sku!: string;
  @Column({ type: 'varchar', nullable: true, length: 120 }) barcode!: string | null;
  @Column({ length: 180, default: '' }) name!: string;
  @Column({ type: 'varchar', nullable: true, length: 100 }) color!: string | null;
  @Column({ type: 'varchar', nullable: true, length: 30 }) size!: string | null;
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true }) price!: string | null;
  @Column({ name: 'inventory_quantity', type: 'int', default: 0 }) inventoryQuantity!: number;
  // `inventoryQuantity` remains the sellable online balance used by checkout.
  // Offline allocation lives on the same physical variant, never on a copied product.
  @Column({ name: 'offline_inventory_quantity', type: 'int', default: 0, transformer: { to: (value: number) => value, from: (value: unknown) => Number(value ?? 0) } }) offlineInventoryQuantity!: number;
  @Column({ name: 'total_inventory_added', type: 'int', default: 0 }) totalInventoryAdded!: number;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ type: 'jsonb', default: () => "'{}'" }) attributes!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ type: 'varchar', nullable: true, length: 255 }) email!: string | null;
  @Column({ type: 'varchar', nullable: true, length: 40 }) phone!: string | null;
  @Column({ name: 'first_name', length: 100, default: '' }) firstName!: string;
  @Column({ name: 'last_name', length: 100, default: '' }) lastName!: string;
  @Column({ type: 'jsonb', default: () => "'{}'" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'customer_id', type: 'uuid' }) customerId!: string;
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'customer_id' }) customer!: Customer;
  @Column({ length: 100, default: '' }) country!: string;
  @Column({ length: 120, default: '' }) city!: string;
  @Column({ name: 'line_1', length: 255, default: '' }) line1!: string;
  @Column({ name: 'line_2', length: 255, default: '' }) line2!: string;
  @Column({ name: 'postal_code', length: 30, default: '' }) postalCode!: string;
  @Column({ name: 'is_default', default: false }) isDefault!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'order_number', type: 'bigint', generated: 'increment' }) orderNumber!: string;
  @Column({ name: 'customer_id', type: 'uuid', nullable: true }) customerId!: string | null;
  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'customer_id' }) customer!: Customer | null;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING }) status!: OrderStatus;
  @Column({ name: 'payment_status', length: 40, default: 'pending' }) paymentStatus!: string;
  @Column({ name: 'fulfillment_status', length: 40, default: 'unfulfilled' }) fulfillmentStatus!: string;
  @Column({ name: 'currency_code', length: 3, default: 'UZS' }) currencyCode!: string;
  @Column({ name: 'subtotal_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) subtotalAmount!: string;
  @Column({ name: 'shipping_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) shippingAmount!: string;
  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) discountAmount!: string;
  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) totalAmount!: string;
  @Column({ type: 'jsonb', default: () => "'{}'" }) shippingAddress!: Record<string, unknown>;
  @Column({ type: 'jsonb', default: () => "'{}'" }) billingAddress!: Record<string, unknown>;
  @Column({ name: 'payment_method', type: 'varchar', length: 60, nullable: true }) paymentMethod!: string | null;
  @Column({ nullable: true, type: 'text' }) note!: string | null;
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true }) items!: OrderItem[];
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId!: string;
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'order_id' }) order!: Order;
  @Column({ name: 'product_id', type: 'uuid', nullable: true }) productId!: string | null;
  @Column({ name: 'variant_id', type: 'uuid', nullable: true }) variantId!: string | null;
  @Column({ name: 'title_snapshot', length: 220 }) titleSnapshot!: string;
  @Column({ name: 'sku_snapshot', type: 'varchar', length: 120, nullable: true }) skuSnapshot!: string | null;
  @Column({ type: 'int' }) quantity!: number;
  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2 }) unitPrice!: string;
  @Column({ name: 'total_price', type: 'numeric', precision: 12, scale: 2 }) totalPrice!: string;
}

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 180 }) title!: string;
  @Column({ name: 'image_url' }) imageUrl!: string;
  @Column({ name: 'mobile_image_url', type: 'varchar', nullable: true }) mobileImageUrl!: string | null;
  @Column({ name: 'target_url', type: 'varchar', nullable: true }) targetUrl!: string | null;
  @Column({ name: 'link_label', length: 80, default: 'Перейти' }) linkLabel!: string;
  @Column({ name: 'text_shadow', default: true }) textShadow!: boolean;
  @Column({ type: 'int', default: 0 }) position!: number;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true }) startsAt!: Date | null;
  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true }) endsAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 180 }) slug!: string;
  @Column({ length: 220 }) title!: string;
  @Column({ name: 'is_published', default: false }) isPublished!: boolean;
  @Column({ type: 'jsonb', default: () => "'{}'" }) seo!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('page_sections')
export class PageSection {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'page_id', type: 'uuid' }) pageId!: string;
  @ManyToOne(() => Page, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'page_id' }) page!: Page;
  @Column({ length: 80 }) type!: string;
  @Column({ type: 'int', default: 0 }) position!: number;
  @Column({ type: 'jsonb', default: () => "'{}'" }) content!: Record<string, unknown>;
  @Column({ name: 'is_visible', default: true }) isVisible!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 220 }) slug!: string;
  @Column({ length: 255 }) title!: string;
  @Column({ type: 'text', default: '' }) excerpt!: string;
  @Column({ type: 'text', default: '' }) body!: string;
  @Column({ name: 'cover_image_url', type: 'varchar', nullable: true }) coverImageUrl!: string | null;
  @Column({ name: 'is_published', default: false }) isPublished!: boolean;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true }) publishedAt!: Date | null;
  @Column({ type: 'jsonb', default: () => "'{}'" }) seo!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('lookbook_entries')
export class LookbookEntry {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 180 }) title!: string;
  @Column({ name: 'image_url' }) imageUrl!: string;
  @Column({ type: 'varchar', nullable: true }) caption!: string | null;
  @Column({ name: 'target_url', type: 'varchar', nullable: true }) targetUrl!: string | null;
  @Column({ type: 'int', default: 0 }) position!: number;
  @Column({ name: 'is_published', default: true }) isPublished!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('music_records')
export class MusicRecord {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 180 }) title!: string;
  @Column({ length: 180, default: '' }) artist!: string;
  @Column({ name: 'audio_url' }) audioUrl!: string;
  @Column({ name: 'cover_image_url', type: 'varchar', nullable: true }) coverImageUrl!: string | null;
  @Column({ type: 'int', default: 0 }) position!: number;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('site_settings')
export class SiteSetting {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 180 }) key!: string;
  @Column({ type: 'jsonb', default: () => "'{}'" }) value!: Record<string, unknown>;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'actor_id', type: 'uuid', nullable: true }) actorId!: string | null;
  @Column({ length: 100 }) action!: string;
  @Column({ name: 'entity_type', length: 100 }) entityType!: string;
  @Column({ name: 'entity_id', type: 'varchar', nullable: true }) entityId!: string | null;
  @Column({ type: 'jsonb', default: () => "'{}'" }) payload!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('inventory_transfers')
export class InventoryTransfer {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'product_id', type: 'uuid' }) productId!: string;
  @ManyToOne(() => Product, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'product_id' }) product!: Product;
  @Column({ name: 'variant_id', type: 'uuid' }) variantId!: string;
  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'variant_id' }) variant!: ProductVariant;
  @Column({ type: 'int' }) quantity!: number;
  @Column({ length: 32 }) direction!: 'to_offline' | 'to_online';
  @Column({ name: 'from_location', length: 80, default: 'online' }) fromLocation!: string;
  @Column({ name: 'to_location', length: 80, default: 'offline' }) toLocation!: string;
  @Column({ name: 'actor_id', type: 'uuid', nullable: true }) actorId!: string | null;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

export const entities = [
  User, Category, CollectionEntity, Product, ProductVariant, Customer,
  CustomerAddress, Order, OrderItem, Banner, Page, PageSection, BlogPost,
  LookbookEntry, MusicRecord, SiteSetting, AuditLog, InventoryTransfer,
];
