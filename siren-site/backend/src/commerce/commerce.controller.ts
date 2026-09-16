import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
  @IsArray() @ValidateNested({ each: true }) @Type(() => CheckoutLineDto) items!: CheckoutLineDto[];
}
class PromoValidationDto { @IsString() promoCode!: string; @IsArray() @IsString({ each: true }) variantIds!: string[]; }
class UpdateOrderDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() paymentStatus?: string;
  @IsOptional() @IsString() fulfillmentStatus?: string;
  @IsOptional() @IsString() note?: string;
}

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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.FULFILLMENT)
@Controller('admin')
export class AdminCommerceController {
  constructor(private readonly commerce: CommerceService) {}
  @Get('orders') orders() { return this.commerce.listOrders(); }
  @Patch('orders/:id') updateOrder(@Param('id') id: string, @Body() body: UpdateOrderDto) { return this.commerce.updateOrder(id, body); }
  @Get('customers') customers() { return this.commerce.listCustomers(); }
  @Get('customers/:id') customer(@Param('id') id: string) { return this.commerce.customerDetails(id); }
}
