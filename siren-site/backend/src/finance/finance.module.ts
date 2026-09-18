import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceEntry, OfflineDailyReport, OfflineSale, Order } from '../database/entities';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
@Module({ imports: [TypeOrmModule.forFeature([FinanceEntry, Order, OfflineSale, OfflineDailyReport])], controllers: [FinanceController], providers: [FinanceService] }) export class FinanceModule {}
