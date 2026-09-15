import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfflineDailyReport, OfflineSale, OfflineSaleItem, OfflineSaleNote, ProductVariant, User } from '../database/entities';
import { OfflineController } from './offline.controller';
import { OfflineService } from './offline.service';

@Module({
  imports: [TypeOrmModule.forFeature([OfflineSale, OfflineSaleItem, OfflineSaleNote, OfflineDailyReport, ProductVariant, User])],
  controllers: [OfflineController],
  providers: [OfflineService],
})
export class OfflineModule {}
