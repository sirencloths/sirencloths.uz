import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Category, CollectionEntity, InventoryTransfer, OrderItem, Product, ProductDiscount, ProductEngagement, ProductVariant, SiteSetting } from '../database/entities';
import { CatalogController, AdminCatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductDiscount, ProductEngagement, Category, CollectionEntity, OrderItem, InventoryTransfer, AuditLog, SiteSetting]), TelegramModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
