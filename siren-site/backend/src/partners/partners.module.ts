import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, Partner, PartnerComment, PartnerPromoUsage, Product, AuditLog } from '../database/entities';
import { PartnersController, PublicPartnersController } from './partners.controller';
import { PartnersService } from './partners.service';
@Module({ imports: [TypeOrmModule.forFeature([Partner, PartnerPromoUsage, PartnerComment, Product, Order, AuditLog])], controllers: [PartnersController, PublicPartnersController], providers: [PartnersService], exports: [PartnersService] })
export class PartnersModule {}
