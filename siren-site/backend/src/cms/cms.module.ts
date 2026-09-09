import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner, BlogPost, LookbookEntry, MusicRecord, Page, PageSection, SiteSetting } from '../database/entities';
import { CmsController, AdminCmsController } from './cms.controller';
import { CmsService } from './cms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, BlogPost, LookbookEntry, MusicRecord, Page, PageSection, SiteSetting])],
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService],
})
export class CmsModule {}
