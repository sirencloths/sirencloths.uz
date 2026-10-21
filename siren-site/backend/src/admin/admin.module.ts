import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Customer, Order, Product, ProductEngagement, SiteSetting, SiteVisit, User } from '../database/entities';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, Order, Customer, ProductEngagement, AuditLog, SiteSetting, SiteVisit])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
