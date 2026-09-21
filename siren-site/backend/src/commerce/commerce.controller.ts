import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsEnum, IsInt, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt.strategy';
import { CustomerJwtGuard } from '../auth/customer-jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { OrderStatus, UserRole } from '../database/entities';
import { CommerceService } from './commerce.service';

class CheckoutLineDto { @IsString() variantId!: string; @IsInt() @Min(1) quantity!: number; }
class CheckoutDto {
  @IsEmail() email!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsObject() shippingAddress!: Record<string, unknown>;
  @IsString() paymentMethod!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsObject() billingAddress?: Record<string, unknown>;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() promoCode?: string;
  @IsOptional() @IsString() fulfillmentMethod?: 'delivery' | 'pickup';
  @IsOptional() @IsString() pickupLocationId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CheckoutLineDto) items!: CheckoutLineDto[];
}
class PickupLocationDto {
  @IsString() name!: string; @IsString() address!: string; @IsString() city!: string;
  @IsString() latitude!: string; @IsString() longitude!: string;
  @IsOptional() @IsString() instructions?: string; @IsOptional() @IsString() workingHours?: string; @IsOptional() isActive?: boolean;
}
class PromoValidationDto { @IsString() promoCode!: string; @IsArray() @IsString({ each: true }) variantIds!: string[]; }
class UpdateOrderDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() paymentStatus?: string;
  @IsOptional() @IsString() fulfillmentStatus?: string;
  @IsOptional() @IsString() note?: string;
}
class CancelOrderDto { @IsString() reason!: string; @IsOptional() @IsString() evidenceUrl?: string; }

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly commerce: CommerceService, private readonly auth: AuthService) {}
  @Post('orders') async createOrder(@Body() body: CheckoutDto, @Headers('authorization') authorization?: string) {
    return this.commerce.checkout({ ...body, customerId: await this.auth.customerIdFromToken(authorization) });
  }
  @Post('promo/validate') validatePromo(@Body() body: PromoValidationDto) { return this.commerce.validatePromo(body.promoCode, body.variantIds); }
  @UseGuards(CustomerJwtGuard)
  @Get('customer/orders') customerOrders(@CurrentUser() customer: { id: string }) { return this.commerce.listCustomerOrders(customer.id); }
}

@Controller('pickup-locations')
export class PickupLocationsController { constructor(private readonly commerce: CommerceService) {} @Get() list() { return this.commerce.listPickupLocations(); } }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FULFILLMENT)
@Controller('admin/pickup-locations')
export class AdminPickupLocationsController {
  constructor(private readonly commerce: CommerceService) {}
  @Get('orders') orders() { return this.commerce.listPickupOrders(); }
  @Get() list() { return this.commerce.listPickupLocations(true); }
  @Post() create(@Body() body: PickupLocationDto) { return this.commerce.createPickupLocation(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: Partial<PickupLocationDto>) { return this.commerce.updatePickupLocation(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.commerce.removePickupLocation(id); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FULFILLMENT)
@Controller('admin')
export class AdminCommerceController {
  constructor(private readonly commerce: CommerceService) {}
  @Get('orders') orders() { return this.commerce.listOrders(); }
  @Patch('orders/:id') updateOrder(@Param('id') id: string, @Body() body: UpdateOrderDto) { return this.commerce.updateOrder(id, body); }
  @Post('orders/:id/cancel') cancelOrder(@Param('id') id: string, @Body() body: CancelOrderDto) { return this.commerce.cancelOrder(id, body); }
  @Post('orders/:id/refund-complete') completeRefund(@Param('id') id: string) { return this.commerce.completeRefund(id); }
  @Get('customers') customers() { return this.commerce.listCustomers(); }
  @Get('customers/:id') customer(@Param('id') id: string) { return this.commerce.customerDetails(id); }
}
