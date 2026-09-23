import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfflineDailyReport, OfflineSale, Order } from '../database/entities';
import { TelegramService } from './telegram.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Order, OfflineSale, OfflineDailyReport])],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
