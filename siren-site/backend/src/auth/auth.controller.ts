import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { CurrentUser, JwtAuthGuard } from './jwt.strategy';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login') login(@Body() body: LoginDto) { return this.auth.login(body.email, body.password); }

  @UseGuards(JwtAuthGuard)
  @Get('me') me(@CurrentUser() user: { id: string }) { return this.auth.me(user.id); }
}
