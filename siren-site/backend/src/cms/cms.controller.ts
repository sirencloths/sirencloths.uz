import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.strategy';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../database/entities';
import { CmsService } from './cms.service';

class CmsDto { @IsOptional() @IsString() title?: string; @IsOptional() @IsString() slug?: string; @IsOptional() @IsString() imageUrl?: string; @IsOptional() @IsString() mobileImageUrl?: string | null; @IsOptional() @IsString() targetUrl?: string | null; @IsOptional() @IsString() linkLabel?: string; @IsOptional() @IsString() excerpt?: string; @IsOptional() @IsString() body?: string; @IsOptional() @IsString() coverImageUrl?: string | null; @IsOptional() @IsString() caption?: string | null; @IsOptional() @IsString() artist?: string; @IsOptional() @IsString() audioUrl?: string; @IsOptional() @IsString() publishedAt?: string | null; @IsOptional() @IsBoolean() isActive?: boolean; @IsOptional() @IsBoolean() isPublished?: boolean; @IsOptional() @IsBoolean() isVisible?: boolean; @IsOptional() @IsBoolean() textShadow?: boolean; @IsOptional() @IsInt() position?: number; @IsOptional() @IsObject() seo?: Record<string, unknown>; @IsOptional() @IsObject() content?: Record<string, unknown>; @IsOptional() @IsString() type?: string; }
class SettingDto { @IsObject() value!: Record<string, unknown>; }

@Controller('content')
export class CmsController {
  constructor(private readonly cms: CmsService) {}
  @Get('banners') banners() { return this.cms.bannersForStorefront(); }
  @Get('posts') posts() { return this.cms.postsForStorefront(); }
  @Get('lookbook') lookbook() { return this.cms.lookbookForStorefront(); }
  @Get('custom-sections') customSections() { return this.cms.customSectionsForStorefront(); }
  @Get('navigation') navigation() { return this.cms.navigationForStorefront(); }
  @Get('records') records() { return this.cms.recordsForStorefront(); }
  @Get('notifications') notifications() { return this.cms.notificationsForStorefront(); }
  @Get('pages/:slug') page(@Param('slug') slug: string) { return this.cms.pageForStorefront(slug); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
@Controller('admin/content')
export class AdminCmsController {
  constructor(private readonly cms: CmsService) {}
  private async saveImage(file: { originalname: string; buffer: Buffer } | undefined, folder: string) {
    if (!file) throw new BadRequestException('Image file is required');
    const extension = extname(file.originalname).toLowerCase() || '.jpg';
    const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
    if (!allowedExtensions.has(extension)) throw new BadRequestException('JPG, PNG, WEBP yoki GIF fayl yuklang');
    const directory = join(process.cwd(), 'uploads', folder);
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(directory, filename), file.buffer);
    return { url: `/uploads/${folder}/${filename}` };
  }
  @Get('banners') banners() { return this.cms.adminBanners(); }
  @Post('banners') createBanner(@Body() body: CmsDto) { return this.cms.createBanner(body); }
  @Post('banners/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('image/')) }))
  async uploadBanner(@UploadedFile() file?: { originalname: string; mimetype: string; buffer: Buffer }) {
    return this.saveImage(file, 'banners');
  }
  @Patch('banners/:id') updateBanner(@Param('id') id: string, @Body() body: CmsDto) { return this.cms.updateBanner(id, body); }
  @Delete('banners/:id') removeBanner(@Param('id') id: string) { return this.cms.removeBanner(id); }
  @Get('posts') posts() { return this.cms.adminPosts(); }
  @Post('posts/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('image/')) }))
  async uploadPostImage(@UploadedFile() file?: { originalname: string; mimetype: string; buffer: Buffer }) { return this.saveImage(file, 'blog'); }
  @Post('posts') createPost(@Body() body: CmsDto) { return this.cms.createPost({ ...body, publishedAt: body.publishedAt ? new Date(body.publishedAt) : null }); }
  @Patch('posts/:id') updatePost(@Param('id') id: string, @Body() body: CmsDto) { return this.cms.updatePost(id, { ...body, publishedAt: body.publishedAt ? new Date(body.publishedAt) : null }); }
  @Delete('posts/:id') removePost(@Param('id') id: string) { return this.cms.removePost(id); }
  @Get('lookbook') lookbook() { return this.cms.adminLookbook(); }
  @Post('lookbook/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('image/')) }))
  async uploadLookbookImage(@UploadedFile() file?: { originalname: string; mimetype: string; buffer: Buffer }) { return this.saveImage(file, 'lookbook'); }
  @Post('lookbook') createLookbook(@Body() body: CmsDto) { return this.cms.createLookbook(body); }
  @Patch('lookbook/:id') updateLookbook(@Param('id') id: string, @Body() body: CmsDto) { return this.cms.updateLookbook(id, body); }
  @Delete('lookbook/:id') removeLookbook(@Param('id') id: string) { return this.cms.removeLookbook(id); }
  @Get('records') records() { return this.cms.adminRecords(); }
  @Post('records') createRecord(@Body() body: CmsDto) { return this.cms.createRecord(body); }
  @Patch('records/:id') updateRecord(@Param('id') id: string, @Body() body: CmsDto) { return this.cms.updateRecord(id, body); }
  @Delete('records/:id') removeRecord(@Param('id') id: string) { return this.cms.removeRecord(id); }
  @Post('records/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith('audio/')) }))
  async uploadRecord(@UploadedFile() file?: { originalname: string; mimetype: string; buffer: Buffer }) {
    if (!file) throw new BadRequestException('Audio file is required');
    const extension = extname(file.originalname).toLowerCase() || '.mp3';
    const allowedExtensions = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac']);
    if (!allowedExtensions.has(extension)) throw new BadRequestException('MP3, M4A, WAV, OGG yoki AAC fayl yuklang');
    const directory = join(process.cwd(), 'uploads', 'records');
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(directory, filename), file.buffer);
    return { url: `/uploads/records/${filename}` };
  }
  @Get('pages') pages() { return this.cms.adminPages(); }
  @Post('pages') createPage(@Body() body: CmsDto) { return this.cms.createPage(body); }
  @Patch('pages/:id') updatePage(@Param('id') id: string, @Body() body: CmsDto) { return this.cms.updatePage(id, body); }
  @Get('pages/:id/sections') sections(@Param('id') id: string) { return this.cms.pageSections(id); }
  @Post('pages/:id/sections') createSection(@Param('id') id: string, @Body() body: CmsDto) { return this.cms.createSection(id, body); }
  @Patch('sections/:id') updateSection(@Param('id') id: string, @Body() body: CmsDto) { return this.cms.updateSection(id, body); }
  @Delete('sections/:id') removeSection(@Param('id') id: string) { return this.cms.removeSection(id); }
  @Get('settings') settings() { return this.cms.settingsList(); }
  @Put('settings/:key') setting(@Param('key') key: string, @Body() body: SettingDto) { return this.cms.setSetting(key, body.value); }
}
