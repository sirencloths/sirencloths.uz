import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Customer, CustomerAddress, Order, OrderItem, Partner, PartnerPromoUsage, Product, ProductVariant } from '../database/entities';
import { CheckoutController, AdminCommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerAddress, Order, OrderItem, Product, ProductVariant, Partner, PartnerPromoUsage, AuditLog])],
  controllers: [CheckoutController, AdminCommerceController],
  providers: [CommerceService],
})
export class CommerceModule {}
