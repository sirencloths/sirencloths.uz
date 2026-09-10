import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser, JwtAuthGuard } from './jwt.strategy';
import { CustomerJwtGuard } from './customer-jwt.strategy';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}
class EmailDto { @IsEmail() email!: string; }
class OtpDto extends EmailDto { @IsString() code!: string; }
class CustomerLoginDto extends EmailDto { @IsString() @MinLength(8) password!: string; }
class RegisterDto {
  @IsString() verificationToken!: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() phone!: string;
  @IsString() region!: string;
  @IsOptional() @IsString() address?: string;
}
class ResetDto { @IsString() verificationToken!: string; @IsString() @MinLength(8) password!: string; }
class CustomerUpdateDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() notificationPreferences?: { blog?: boolean; discounts?: boolean };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login') login(@Body() body: LoginDto) { return this.auth.login(body.email, body.password); }

  @UseGuards(JwtAuthGuard)
  @Get('me') me(@CurrentUser() user: { id: string }) { return this.auth.me(user.id); }

  @Post('customer/email') beginCustomerEmail(@Body() body: EmailDto) { return this.auth.beginCustomerEmail(body.email); }
  @Post('customer/verify-registration') verifyRegistration(@Body() body: OtpDto) { return this.auth.verifyCustomerOtp(body.email, body.code, 'registration'); }
  @Post('customer/register') register(@Body() body: RegisterDto) { return this.auth.registerCustomer(body.verificationToken, body); }
  @Post('customer/login') customerLogin(@Body() body: CustomerLoginDto) { return this.auth.customerLogin(body.email, body.password); }
  @Post('customer/password-reset/request') passwordResetRequest(@Body() body: EmailDto) { return this.auth.beginPasswordReset(body.email); }
  @Post('customer/password-reset/verify') passwordResetVerify(@Body() body: OtpDto) { return this.auth.verifyCustomerOtp(body.email, body.code, 'password_reset'); }
  @Post('customer/password-reset/complete') passwordResetComplete(@Body() body: ResetDto) { return this.auth.resetCustomerPassword(body.verificationToken, body.password); }

  @UseGuards(CustomerJwtGuard)
  @Get('customer/me') customerMe(@CurrentUser() customer: { id: string }) { return this.auth.customerMe(customer.id); }
  @UseGuards(CustomerJwtGuard)
  @Patch('customer/me') updateCustomer(@CurrentUser() customer: { id: string }, @Body() body: CustomerUpdateDto) { return this.auth.updateCustomer(customer.id, body); }
}
