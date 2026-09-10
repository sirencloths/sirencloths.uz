import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Category, CollectionEntity, InventoryTransfer, OrderItem, Product, ProductVariant, SiteSetting } from '../database/entities';
import { CatalogController, AdminCatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, Category, CollectionEntity, OrderItem, InventoryTransfer, AuditLog, SiteSetting])],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
