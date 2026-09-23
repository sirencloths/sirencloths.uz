import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt.strategy';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { FinanceEntryType, UserRole } from '../database/entities';
import { FinanceService } from './finance.service';

class FinanceEntryDto { @IsEnum(FinanceEntryType) type!: FinanceEntryType; @IsString() @MaxLength(180) title!: string; @IsString() @MaxLength(80) category!: string; @Min(0.01) amount!: number; @IsOptional() @IsString() currencyCode?: string; @IsOptional() occurredAt?: string; @IsOptional() @IsString() note?: string; @IsOptional() @IsString() receiptUrl?: string; }
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.ANALYST) @Controller('admin/finance')
export class FinanceController { constructor(private readonly finance: FinanceService) {} @Get() overview() { return this.finance.overview(); } @Get('reports') reports(@Query('scope') scope?: string, @Query('from') from?: string, @Query('to') to?: string) { return this.finance.reports(scope, from, to); } @Post('entries') create(@Body() body: FinanceEntryDto, @CurrentUser() actor: { id: string }) { return this.finance.create(actor.id, body); } }
