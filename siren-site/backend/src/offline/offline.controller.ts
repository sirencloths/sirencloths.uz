import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt.strategy';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../database/entities';
import { OfflineService } from './offline.service';

class SaleItemDto { @IsUUID() variantId!: string; @IsInt() @Min(1) quantity!: number; }
class CreateSaleDto {
  @IsArray() items!: SaleItemDto[];
  @IsString() paymentMethod!: string;
  @IsOptional() @IsInt() @Min(0) discountAmount?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() noteImageUrl?: string;
}
class NoteDto { @IsOptional() @IsString() body?: string; @IsOptional() @IsString() imageUrl?: string; }
class ReportDto {
  @IsString() reportDate!: string;
  @IsInt() @Min(0) cashAmount!: number;
  @IsInt() @Min(0) cardAmount!: number;
  @IsInt() @Min(0) transferAmount!: number;
  @IsInt() @Min(0) expenseAmount!: number;
  @IsOptional() @IsString() note?: string;
}
class VoidDto { @IsString() reason!: string; }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CASHIER)
@Controller('offline')
export class OfflineController {
  constructor(private readonly offline: OfflineService) {}
  @Get('inventory') inventory() { return this.offline.inventory(); }
  @Get('scan/:ean') scan(@Param('ean') ean: string) { return this.offline.scan(ean); }
  @Get('sales') sales(@CurrentUser() user: { id: string; role: UserRole }) { return this.offline.sales(user); }
  @Post('sales') sale(@Body() body: CreateSaleDto, @CurrentUser() user: { id: string; role: UserRole }) { return this.offline.createSale(body, user); }
  @Post('sales/:id/notes') note(@Param('id') id: string, @Body() body: NoteDto, @CurrentUser() user: { id: string; role: UserRole }) { return this.offline.addNote(id, body, user); }
  @Post('sales/:id/void') @Roles(UserRole.SUPER_ADMIN) voidSale(@Param('id') id: string, @Body() body: VoidDto, @CurrentUser() user: { id: string }) { return this.offline.voidSale(id, body.reason, user.id); }
  @Get('reports/:date') report(@Param('date') date: string, @CurrentUser() user: { id: string; role: UserRole }) { return this.offline.report(date, user); }
  @Put('reports/:date') saveReport(@Param('date') date: string, @Body() body: ReportDto, @CurrentUser() user: { id: string; role: UserRole }) { return this.offline.saveReport(date, body, user); }
  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('image/')) }))
  async upload(@UploadedFile() file?: { originalname: string; buffer: Buffer }) {
    if (!file) throw new BadRequestException('Rasm fayli kerak');
    const extension = extname(file.originalname).toLowerCase() || '.jpg';
    if (!new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']).has(extension)) throw new BadRequestException('JPG, PNG, WEBP yoki GIF yuklang');
    const directory = join(process.cwd(), 'uploads', 'offline-notes'); await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}${extension}`; await writeFile(join(directory, filename), file.buffer);
    return { url: `/uploads/offline-notes/${filename}` };
  }
}
