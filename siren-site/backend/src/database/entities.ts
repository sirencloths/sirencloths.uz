import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  CASHIER = 'cashier',
  EDITOR = 'editor',
  FULFILLMENT = 'fulfillment',
  ANALYST = 'analyst',
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}
export enum ProductGender { MALE = 'male', FEMALE = 'female', UNISEX = 'unisex' }

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
export enum PartnerType { SPONSOR = 'sponsor', INFLUENCER = 'influencer', REFERRAL = 'referral', AFFILIATE = 'affiliate' }
export enum EmploymentStatus { ACTIVE = 'active', INVITED = 'invited', ON_LEAVE = 'on_leave', SUSPENDED = 'suspended', TERMINATED = 'terminated' }
export enum EmploymentType { FULL_TIME = 'full_time', PART_TIME = 'part_time', CONTRACTOR = 'contractor', INTERN = 'intern', FREELANCER = 'freelancer' }
export enum PermissionScope { OWN = 'own', TEAM = 'team', ASSIGNED = 'assigned', ALL = 'all' }
export enum FinanceEntryType { INCOME = 'income', EXPENSE = 'expense' }

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

/** Business identity is deliberately separate from a login account. */
@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'employee_id', length: 24 }) employeeId!: string;
  @Index({ unique: true }) @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId!: string | null;
  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'user_id' }) user!: User | null;
  @Column({ name: 'first_name', length: 100, default: '' }) firstName!: string;
  @Column({ name: 'last_name', length: 100, default: '' }) lastName!: string;
  @Column({ name: 'middle_name', type: 'varchar', length: 100, nullable: true }) middleName!: string | null;
  @Column({ name: 'display_name', type: 'varchar', length: 160, nullable: true }) displayName!: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone!: string | null;
  @Column({ name: 'avatar_url', type: 'varchar', nullable: true }) avatarUrl!: string | null;
  @Column({ name: 'job_title', type: 'varchar', length: 160, nullable: true }) jobTitle!: string | null;
  @Column({ type: 'varchar', length: 24, default: EmploymentStatus.INVITED }) status!: EmploymentStatus;
  @Column({ name: 'employment_type', type: 'varchar', length: 24, default: EmploymentType.FULL_TIME }) employmentType!: EmploymentType;
  @Column({ name: 'birth_date', type: 'date', nullable: true }) birthDate!: string | null;
  @Column({ name: 'residential_address', type: 'varchar', nullable: true }) residentialAddress!: string | null;
  @Column({ type: 'varchar', length: 100, nullable: true }) country!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) region!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) city!: string | null;
  @Column({ name: 'emergency_contact_name', type: 'varchar', nullable: true }) emergencyContactName!: string | null;
  @Column({ name: 'emergency_contact_phone', type: 'varchar', nullable: true }) emergencyContactPhone!: string | null;
  @Column({ name: 'manager_employee_id', type: 'uuid', nullable: true }) managerEmployeeId!: string | null;
  @Column({ name: 'start_date', type: 'date', nullable: true }) startDate!: string | null;
  @Column({ name: 'end_date', type: 'date', nullable: true }) endDate!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'team_id', length: 24 }) teamId!: string;
  @Column({ length: 140 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'icon_url', type: 'varchar', nullable: true }) iconUrl!: string | null;
  @Column({ length: 20, default: '#465fff' }) color!: string;
  @Column({ name: 'parent_id', type: 'uuid', nullable: true }) parentId!: string | null;
  @Column({ name: 'leader_employee_id', type: 'uuid', nullable: true }) leaderEmployeeId!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('employee_teams') @Index(['employeeId', 'teamId'], { unique: true })
export class EmployeeTeam {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'employee_id', type: 'uuid' }) employeeId!: string;
  @Column({ name: 'team_id', type: 'uuid' }) teamId!: string;
  @Column({ name: 'is_primary', default: false }) isPrimary!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('admin_roles')
export class AdminRole {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'role_id', length: 24 }) roleId!: string;
  @Index({ unique: true }) @Column({ length: 120 }) name!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ length: 20, default: '#465fff' }) color!: string;
  @Column({ name: 'is_system', default: false }) isSystem!: boolean;
  @Column({ name: 'is_protected', default: false }) isProtected!: boolean;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ length: 120 }) key!: string;
  @Column({ length: 80 }) module!: string;
  @Column({ length: 160 }) label!: string;
  @Column({ name: 'is_sensitive', default: false }) isSensitive!: boolean;
  @Column({ name: 'default_scope', type: 'varchar', length: 16, default: PermissionScope.ALL }) defaultScope!: PermissionScope;
}

@Entity('role_permissions') @Index(['roleId', 'permissionId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'role_id', type: 'uuid' }) roleId!: string;
  @Column({ name: 'permission_id', type: 'uuid' }) permissionId!: string;
  @Column({ type: 'varchar', length: 16, default: PermissionScope.ALL }) scope!: PermissionScope;
}

@Entity('employee_roles') @Index(['employeeId', 'roleId'], { unique: true })
export class EmployeeRole {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'employee_id', type: 'uuid' }) employeeId!: string;
  @Column({ name: 'role_id', type: 'uuid' }) roleId!: string;
  @Column({ name: 'assigned_by', type: 'uuid', nullable: true }) assignedBy!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('employee_invitations')
export class EmployeeInvitation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'token_hash', length: 255 }) tokenHash!: string;
  @Column({ name: 'employee_id', type: 'uuid' }) employeeId!: string;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true }) acceptedAt!: Date | null;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true }) cancelledAt!: Date | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
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
  // A scheduled product remains a draft until this instant.  Keeping the
  // scheduling data on the product makes the public launch timer and the
  // actual publication use one source of truth.
  @Index() @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true }) scheduledAt!: Date | null;
  @Column({ name: 'show_launch_countdown', default: false }) showLaunchCountdown!: boolean;
  @Column({ name: 'launch_countdown_text', type: 'varchar', length: 180, nullable: true }) launchCountdownText!: string | null;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 }) price!: string;
  @Column({ name: 'compare_at_price', type: 'numeric', precision: 12, scale: 2, nullable: true }) compareAtPrice!: string | null;
  @Column({ name: 'currency_code', length: 3, default: 'UZS' }) currencyCode!: string;
  @Column({ name: 'category_id', type: 'uuid', nullable: true }) categoryId!: string | null;
  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' }) @JoinColumn({ name: 'category_id' }) category!: Category | null;
  @Index() @Column({ type: 'varchar', length: 16, default: ProductGender.UNISEX }) gender!: ProductGender;
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
  @Index({ unique: true }) @Column({ type: 'varchar', nullable: true, length: 13 }) barcode!: string | null;
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
  @Column({ name: 'password_hash', type: 'varchar', nullable: true, select: false }) passwordHash!: string | null;
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true }) emailVerifiedAt!: Date | null;
  @Column({ type: 'varchar', nullable: true, length: 120 }) region!: string | null;
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true }) lastLoginAt!: Date | null;
  @Column({ name: 'registration_source', length: 80, default: 'checkout' }) registrationSource!: string;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'welcome_discount_eligible', default: false }) welcomeDiscountEligible!: boolean;
  @Column({ name: 'welcome_discount_percent', type: 'int', default: 0 }) welcomeDiscountPercent!: number;
  @Column({ name: 'welcome_discount_expires_at', type: 'timestamptz', nullable: true }) welcomeDiscountExpiresAt!: Date | null;
  @Column({ name: 'welcome_discount_used_at', type: 'timestamptz', nullable: true }) welcomeDiscountUsedAt!: Date | null;
  @Column({ type: 'jsonb', default: () => "'{}'" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('auth_otps')
@Index(['email', 'purpose'])
export class AuthOtp {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 255 }) email!: string;
  @Column({ length: 40 }) purpose!: 'registration' | 'password_reset' | 'password_change';
  @Column({ name: 'code_hash', length: 255, select: false }) codeHash!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'resend_available_at', type: 'timestamptz' }) resendAvailableAt!: Date;
  @Column({ type: 'int', default: 0 }) attempts!: number;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

// Refresh tokens are represented by server-side sessions.  The browser only
// receives a signed token; its bcrypt hash is stored here so a token can be
// rotated and revoked immediately without waiting for its JWT expiry.
@Entity('auth_sessions')
@Index(['userId', 'revokedAt'])
@Index(['customerId', 'revokedAt'])
export class AuthSession {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId!: string | null;
  @Column({ name: 'customer_id', type: 'uuid', nullable: true }) customerId!: string | null;
  @Column({ length: 20 }) kind!: 'admin' | 'customer';
  @Column({ name: 'token_hash', length: 255, select: false }) tokenHash!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
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
  @Column({ length: 120, default: '' }) genre!: string;
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

// Offline shop sales are deliberately independent from web orders: their stock
// comes from the offline allocation and they are reconciled per cashier/day.
@Entity('offline_sales')
export class OfflineSale {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index({ unique: true }) @Column({ name: 'receipt_number', type: 'bigint', generated: 'increment' }) receiptNumber!: string;
  @Index({ unique: true }) @Column({ name: 'receipt_barcode', type: 'varchar', length: 13, nullable: true }) receiptBarcode!: string | null;
  @Column({ name: 'cashier_id', type: 'uuid' }) cashierId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'cashier_id' }) cashier!: User;
  @Column({ name: 'payment_method', length: 32 }) paymentMethod!: string;
  @Column({ name: 'currency_code', length: 3, default: 'UZS' }) currencyCode!: string;
  @Column({ name: 'subtotal_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) subtotalAmount!: string;
  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) discountAmount!: string;
  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) totalAmount!: string;
  @Column({ name: 'is_voided', default: false }) isVoided!: boolean;
  @Column({ name: 'void_reason', type: 'text', nullable: true }) voidReason!: string | null;
  @OneToMany(() => OfflineSaleItem, (item) => item.sale, { cascade: true }) items!: OfflineSaleItem[];
  @OneToMany(() => OfflineSaleNote, (note) => note.sale, { cascade: true }) notes!: OfflineSaleNote[];
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('offline_sale_items')
export class OfflineSaleItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'sale_id', type: 'uuid' }) saleId!: string;
  @ManyToOne(() => OfflineSale, (sale) => sale.items, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'sale_id' }) sale!: OfflineSale;
  @Column({ name: 'product_id', type: 'uuid' }) productId!: string;
  @Column({ name: 'variant_id', type: 'uuid' }) variantId!: string;
  @Column({ name: 'title_snapshot', length: 220 }) titleSnapshot!: string;
  @Column({ name: 'sku_snapshot', length: 120 }) skuSnapshot!: string;
  @Column({ name: 'barcode_snapshot', type: 'varchar', length: 13, nullable: true }) barcodeSnapshot!: string | null;
  @Column({ name: 'image_url', type: 'varchar', nullable: true }) imageUrl!: string | null;
  @Column({ type: 'int' }) quantity!: number;
  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2 }) unitPrice!: string;
  @Column({ name: 'total_price', type: 'numeric', precision: 12, scale: 2 }) totalPrice!: string;
}

@Entity('offline_sale_notes')
export class OfflineSaleNote {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'sale_id', type: 'uuid' }) saleId!: string;
  @ManyToOne(() => OfflineSale, (sale) => sale.notes, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'sale_id' }) sale!: OfflineSale;
  @Column({ name: 'author_id', type: 'uuid' }) authorId!: string;
  @Column({ type: 'text', default: '' }) body!: string;
  @Column({ name: 'image_url', type: 'varchar', nullable: true }) imageUrl!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('offline_daily_reports')
@Index(['cashierId', 'reportDate'], { unique: true })
export class OfflineDailyReport {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'cashier_id', type: 'uuid' }) cashierId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'cashier_id' }) cashier!: User;
  @Column({ name: 'report_date', type: 'date' }) reportDate!: string;
  @Column({ name: 'cash_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) cashAmount!: string;
  @Column({ name: 'card_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) cardAmount!: string;
  @Column({ name: 'click_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) clickAmount!: string;
  @Column({ name: 'payme_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) paymeAmount!: string;
  @Column({ name: 'transfer_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) transferAmount!: string;
  @Column({ name: 'expense_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) expenseAmount!: string;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('product_discounts')
@Index(['productId', 'color', 'size'])
export class ProductDiscount {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'product_id', type: 'uuid' }) productId!: string;
  @ManyToOne(() => Product, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'product_id' }) product!: Product;
  @Column({ type: 'varchar', length: 100, nullable: true }) color!: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) size!: string | null;
  @Column({ type: 'int' }) percent!: number;
  // A discount can be permanent. A null expiry is deliberately shown without
  // a storefront countdown.
  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true }) endsAt!: Date | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 180 }) name!: string;
  @Column({ name: 'logo_url', type: 'varchar', nullable: true }) logoUrl!: string | null;
  @Column({ name: 'show_in_checkout_summary', type: 'boolean', default: false }) showInCheckoutSummary!: boolean;
  @Column({ type: 'enum', enum: PartnerType }) type!: PartnerType;
  @Column({ type: 'varchar', nullable: true, length: 255 }) email!: string | null;
  @Column({ type: 'varchar', nullable: true, length: 50 }) phone!: string | null;
  @Column({ type: 'varchar', nullable: true, length: 255 }) social!: string | null;
  @Index({ unique: true }) @Column({ name: 'promo_code', type: 'varchar', nullable: true, length: 60 }) promoCode!: string | null;
  @Column({ name: 'discount_percent', type: 'int', default: 0 }) discountPercent!: number;
  @Column({ name: 'product_ids', type: 'jsonb', default: () => "'[]'" }) productIds!: string[];
  @Column({ name: 'per_customer_limit', type: 'int', nullable: true }) perCustomerLimit!: number | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true }) archivedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
@Entity('partner_promo_usages')
@Index(['partnerId', 'customerId'])
export class PartnerPromoUsage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'partner_id', type: 'uuid' }) partnerId!: string;
  @Column({ name: 'customer_id', type: 'uuid', nullable: true }) customerId!: string | null;
  @Column({ name: 'order_id', type: 'uuid', nullable: true }) orderId!: string | null;
  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) discountAmount!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
@Entity('partner_comments')
@Index(['partnerId', 'createdAt'])
export class PartnerComment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'partner_id', type: 'uuid' }) partnerId!: string;
  @ManyToOne(() => Partner, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'partner_id' }) partner!: Partner;
  @Column({ name: 'author_id', type: 'uuid', nullable: true }) authorId!: string | null;
  @Column({ type: 'text' }) body!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

/** Manual income and expenses. Order revenue and refunds remain immutable order-derived entries. */
@Entity('finance_entries')
export class FinanceEntry {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 16 }) type!: FinanceEntryType;
  @Column({ length: 180 }) title!: string;
  @Column({ length: 80, default: 'Boshqa' }) category!: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount!: string;
  @Column({ name: 'currency_code', length: 3, default: 'UZS' }) currencyCode!: string;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt!: Date;
  @Column({ type: 'text', nullable: true }) note!: string | null;
  @Column({ name: 'receipt_url', type: 'varchar', nullable: true }) receiptUrl!: string | null;
  @Column({ name: 'created_by', type: 'uuid', nullable: true }) createdBy!: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}

export const entities = [
  User, Category, CollectionEntity, Product, ProductVariant, Customer, AuthOtp, AuthSession,
  CustomerAddress, Order, OrderItem, Banner, Page, PageSection, BlogPost,
  LookbookEntry, MusicRecord, SiteSetting, AuditLog, InventoryTransfer, OfflineSale, OfflineSaleItem, OfflineSaleNote, OfflineDailyReport, ProductDiscount, Partner, PartnerPromoUsage, PartnerComment,
  Employee, Team, EmployeeTeam, AdminRole, Permission, RolePermission, EmployeeRole, EmployeeInvitation, FinanceEntry,
];
