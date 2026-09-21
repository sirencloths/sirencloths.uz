import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Customer, CustomerAddress, Order, OrderItem, Partner, PartnerPromoUsage, PickupLocation, Product, ProductVariant } from '../database/entities';
import { CheckoutController, AdminCommerceController, AdminPickupLocationsController, PickupLocationsController } from './commerce.controller';
import { CommerceService } from './commerce.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, CustomerAddress, Order, OrderItem, Product, ProductVariant, Partner, PartnerPromoUsage, AuditLog, PickupLocation])],
  controllers: [CheckoutController, AdminCommerceController, PickupLocationsController, AdminPickupLocationsController],
  providers: [CommerceService],
})
export class CommerceModule {}
