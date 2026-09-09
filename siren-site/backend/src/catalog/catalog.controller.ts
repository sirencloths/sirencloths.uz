import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Matches, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { CurrentUser } from '../auth/jwt.strategy';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { ProductStatus, UserRole } from '../database/entities';
import { CatalogService } from './catalog.service';

class ProductDto {
  @IsString() @MinLength(2) slug!: string;
  @IsString() @MinLength(2) title!: string;
  @IsString() price!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsString() compareAtPrice?: string | null;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currencyCode?: string;
  @IsOptional() @IsUUID() categoryId?: string | null;
  @IsOptional() @IsArray() media?: Array<{ url: string; alt?: string; position?: number }>;
  @IsOptional() @IsObject() seo?: Record<string, unknown>;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
class VariantDto {
  @IsString() sku!: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() barcode?: string | null;
  @IsOptional() @IsString() color?: string | null;
  @IsOptional() @IsString() size?: string | null;
  @IsOptional() @IsString() price?: string | null;
  @IsOptional() @IsInt() @Min(0) inventoryQuantity?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}
class InventoryMoveItemDto {
  @IsUUID() variantId!: string;
  @IsInt() @Min(1) quantity!: number;
}
class InventoryMoveDto {
  @IsArray() items!: InventoryMoveItemDto[];
  @IsOptional() @IsString() note?: string;
}
class TaxonomyDto {
  @IsString() slug!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() imageUrl?: string | null;
  @IsOptional() @IsString() heroImageUrl?: string | null;
  @IsOptional() @IsInt() position?: number;
  @IsOptional() @IsBoolean() isVisible?: boolean;
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('products') products() { return this.catalog.publicProducts(); }
  @Get('products/:slug') product(@Param('slug') slug: string) { return this.catalog.publicProduct(slug); }
  @Get('categories') categories() { return this.catalog.publicCategories(); }
  @Get('collections') collections() { return this.catalog.publicCollections(); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('products') products() { return this.catalog.adminProducts(); }
  @Post('products') createProduct(@Body() body: ProductDto) { return this.catalog.createProduct(body); }
  @Patch('products/:id') updateProduct(@Param('id') id: string, @Body() body: Partial<ProductDto>) { return this.catalog.updateProduct(id, body); }
  @Delete('products/:id') removeProduct(@Param('id') id: string) { return this.catalog.removeProduct(id); }
  @Get('products/:id/variants') variants(@Param('id') id: string) { return this.catalog.variantsFor(id); }
  @Post('products/:id/variants') createVariant(@Param('id') id: string, @Body() body: VariantDto) { return this.catalog.createVariant(id, body); }
  @Patch('variants/:id') updateVariant(@Param('id') id: string, @Body() body: Partial<VariantDto>) { return this.catalog.updateVariant(id, body); }
  @Delete('variants/:id') removeVariant(@Param('id') id: string) { return this.catalog.removeVariant(id); }
  @Get('transfers') transfers() { return this.catalog.transferHistory(); }
  @Post('transfers') transfer(@Body() body: InventoryMoveDto, @CurrentUser() actor: { id: string }) { return this.catalog.transferToOffline(body.items, actor.id, body.note); }
  @Post('transfers/return') returnToOnline(@Body() body: InventoryMoveDto, @CurrentUser() actor: { id: string }) { return this.catalog.returnToOnline(body.items, actor.id, body.note); }
  @Get('categories') categories() { return this.catalog.adminCategories(); }
  @Post('categories') createCategory(@Body() body: TaxonomyDto) { return this.catalog.createCategory(body); }
  @Patch('categories/:id') updateCategory(@Param('id') id: string, @Body() body: Partial<TaxonomyDto>) { return this.catalog.updateCategory(id, body); }
  @Delete('categories/:id') removeCategory(@Param('id') id: string) { return this.catalog.removeCategory(id); }
  @Get('collections') collections() { return this.catalog.adminCollections(); }
  @Post('collections') createCollection(@Body() body: TaxonomyDto) { return this.catalog.createCollection(body); }
  @Patch('collections/:id') updateCollection(@Param('id') id: string, @Body() body: Partial<TaxonomyDto>) { return this.catalog.updateCollection(id, body); }
  @Delete('collections/:id') removeCollection(@Param('id') id: string) { return this.catalog.removeCollection(id); }
}
