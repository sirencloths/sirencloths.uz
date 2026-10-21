import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog, Banner, BlogPost, LookbookEntry, MusicRecord, Page, PageSection, Product, SiteSetting, SiteVisit } from '../database/entities';
import { CmsController, AdminCmsController } from './cms.controller';
import { CmsService } from './cms.service';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, BlogPost, LookbookEntry, MusicRecord, Page, PageSection, Product, SiteSetting, SiteVisit, AuditLog]), TelegramModule],
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService],
})
export class CmsModule {}
