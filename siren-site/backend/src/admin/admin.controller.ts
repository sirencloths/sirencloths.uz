import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt.strategy';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../database/entities';
import { AdminService } from './admin.service';

class AdminUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
}
class UpdateAdminUserDto {
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ANALYST)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('dashboard') dashboard() { return this.admin.dashboard(); }
  @Get('audit-logs') logs() { return this.admin.logs(); }
  @Roles(UserRole.SUPER_ADMIN)
  @Get('users') users() { return this.admin.listUsers(); }
  @Roles(UserRole.SUPER_ADMIN)
  @Post('users') createUser(@Body() body: AdminUserDto, @CurrentUser() actor: { id: string }) { return this.admin.createUser(body, actor.id); }
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('users/:id') updateUser(@Param('id') id: string, @Body() body: UpdateAdminUserDto, @CurrentUser() actor: { id: string }) { return this.admin.updateUser(id, body, actor.id); }
}
