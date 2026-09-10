import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Banner, BlogPost, LookbookEntry, MusicRecord, Page, PageSection, SiteSetting } from '../database/entities';

const DEFAULT_NAVIGATION = [
  { id: 'shop', href: '/shop', label: 'shop', translationKey: 'shop', isActive: true, isBuiltIn: true },
  { id: 'collections', href: '/collections', label: 'collections', translationKey: 'collections', isActive: true, isBuiltIn: true },
  { id: 'lookbook', href: '/lookbook', label: 'lookbook', translationKey: 'lookbook', isActive: true, isBuiltIn: true },
  { id: 'blog', href: '/blog', label: 'blog', translationKey: 'blog', isActive: true, isBuiltIn: true },
];

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(Banner) private readonly banners: Repository<Banner>,
    @InjectRepository(Page) private readonly pages: Repository<Page>,
    @InjectRepository(PageSection) private readonly sections: Repository<PageSection>,
    @InjectRepository(BlogPost) private readonly posts: Repository<BlogPost>,
    @InjectRepository(LookbookEntry) private readonly lookbook: Repository<LookbookEntry>,
    @InjectRepository(MusicRecord) private readonly records: Repository<MusicRecord>,
    @InjectRepository(SiteSetting) private readonly settings: Repository<SiteSetting>,
  ) {}
  bannersForStorefront() { return this.banners.find({ where: { isActive: true }, order: { position: 'ASC' } }); }
  postsForStorefront() { return this.posts.find({ where: { isPublished: true }, order: { publishedAt: 'DESC' } }); }
  lookbookForStorefront() { return this.lookbook.find({ where: { isPublished: true }, order: { position: 'ASC' } }); }
  async customSectionsForStorefront() {
    const setting = await this.settings.findOneBy({ key: 'page-banners' });
    const items = setting?.value?.items;
    return Array.isArray(items)
      ? items.filter((item) => !item || typeof item !== 'object' || (item as { isActive?: boolean }).isActive !== false)
      : [];
  }
  async navigationForStorefront() {
    const setting = await this.settings.findOneBy({ key: 'navigation' });
    const items = setting?.value?.items;
    if (!Array.isArray(items)) return DEFAULT_NAVIGATION;
    return items
      .filter((item) => item && typeof item === 'object' && (item as { isActive?: boolean }).isActive !== false)
      .map((item) => {
        const value = item as Record<string, unknown>;
        return {
          id: String(value.id ?? ''),
          href: String(value.href ?? '/'),
          label: String(value.label ?? ''),
          translationKey: typeof value.translationKey === 'string' ? value.translationKey : undefined,
          isActive: true,
          isBuiltIn: value.isBuiltIn === true,
        };
      })
      .filter((item) => item.id && item.label && item.href);
  }
  async pageForStorefront(slug: string) {
    const page = await this.pages.findOneBy({ slug, isPublished: true });
    if (!page) throw new NotFoundException('Page not found');
    return { ...page, sections: await this.sections.find({ where: { pageId: page.id, isVisible: true }, order: { position: 'ASC' } }) };
  }
  adminBanners() { return this.banners.find({ order: { position: 'ASC' } }); }
  createBanner(input: Partial<Banner>) { return this.banners.save(this.banners.create(input)); }
  async updateBanner(id: string, input: Partial<Banner>) { const entity = await this.banners.preload({ id, ...input }); if (!entity) throw new NotFoundException('Banner not found'); return this.banners.save(entity); }
  async removeBanner(id: string) { await this.banners.delete(id); return { deleted: true }; }
  adminPosts() { return this.posts.find({ order: { updatedAt: 'DESC' } }); }
  async createPost(input: Partial<BlogPost>) {
    const post = await this.posts.save(this.posts.create(input));
    if (post.isPublished) await this.appendAutomaticNotification({ kind: 'blog', title: post.title, text: post.excerpt || post.body.slice(0, 140), imageUrl: post.coverImageUrl || '', href: `/blog/${post.slug}` });
    return post;
  }
  async updatePost(id: string, input: Partial<BlogPost>) { const entity = await this.posts.preload({ id, ...input }); if (!entity) throw new NotFoundException('Blog post not found'); return this.posts.save(entity); }
  async removePost(id: string) { await this.posts.delete(id); return { deleted: true }; }
  adminLookbook() { return this.lookbook.find({ order: { position: 'ASC' } }); }
  createLookbook(input: Partial<LookbookEntry>) { return this.lookbook.save(this.lookbook.create(input)); }
  async updateLookbook(id: string, input: Partial<LookbookEntry>) { const entity = await this.lookbook.preload({ id, ...input }); if (!entity) throw new NotFoundException('Lookbook entry not found'); return this.lookbook.save(entity); }
  async removeLookbook(id: string) { await this.lookbook.delete(id); return { deleted: true }; }
  recordsForStorefront() { return this.records.find({ where: { isActive: true }, order: { position: 'ASC', createdAt: 'DESC' } }); }
  async notificationsForStorefront() {
    const setting = await this.settings.findOneBy({ key: 'site-notifications' });
    const items = setting?.value?.items;
    return Array.isArray(items)
      ? items.filter((item) => item && typeof item === 'object' && (item as { isActive?: boolean }).isActive !== false)
        .sort((a, b) => String((b as { createdAt?: string }).createdAt ?? '').localeCompare(String((a as { createdAt?: string }).createdAt ?? '')))
        .map((item) => { const { clickVisitorIds: _clickVisitorIds, ...safe } = item as Record<string, unknown>; return safe; })
      : [];
  }
  async recordNotificationClick(id: string, visitorId: string) {
    const cleanVisitorId = visitorId.trim().slice(0, 120);
    if (!cleanVisitorId) return { clicks: 0 };
    const setting = await this.settings.findOneBy({ key: 'site-notifications' });
    const items = Array.isArray(setting?.value?.items) ? setting.value.items : [];
    let clicks = 0;
    const nextItems = items.map((item) => {
      if (!item || typeof item !== 'object' || (item as { id?: string }).id !== id) return item;
      const value = item as Record<string, unknown>;
      const visitors = Array.isArray(value.clickVisitorIds) ? value.clickVisitorIds.filter((entry): entry is string => typeof entry === 'string') : [];
      const nextVisitors = visitors.includes(cleanVisitorId) ? visitors : [...visitors, cleanVisitorId];
      clicks = nextVisitors.length;
      return { ...value, clickVisitorIds: nextVisitors, clicks };
    });
    if (setting) await this.settings.save({ ...setting, value: { ...setting.value, items: nextItems } });
    return { clicks };
  }
  adminRecords() { return this.records.find({ order: { position: 'ASC', createdAt: 'DESC' } }); }
  createRecord(input: Partial<MusicRecord>) { return this.records.save(this.records.create(input)); }
  async updateRecord(id: string, input: Partial<MusicRecord>) { const entity = await this.records.preload({ id, ...input }); if (!entity) throw new NotFoundException('Music record not found'); return this.records.save(entity); }
  async removeRecord(id: string) { await this.records.delete(id); return { deleted: true }; }
  adminPages() { return this.pages.find({ order: { updatedAt: 'DESC' } }); }
  createPage(input: Partial<Page>) { return this.pages.save(this.pages.create(input)); }
  async updatePage(id: string, input: Partial<Page>) { const entity = await this.pages.preload({ id, ...input }); if (!entity) throw new NotFoundException('Page not found'); return this.pages.save(entity); }
  async pageSections(pageId: string) { return this.sections.find({ where: { pageId }, order: { position: 'ASC' } }); }
  createSection(pageId: string, input: Partial<PageSection>) { return this.sections.save(this.sections.create({ ...input, pageId })); }
  async updateSection(id: string, input: Partial<PageSection>) { const entity = await this.sections.preload({ id, ...input }); if (!entity) throw new NotFoundException('Section not found'); return this.sections.save(entity); }
  async removeSection(id: string) { await this.sections.delete(id); return { deleted: true }; }
  settingsList() { return this.settings.find({ order: { key: 'ASC' } }); }
  async setSetting(key: string, value: Record<string, unknown>) { const current = await this.settings.findOneBy({ key }); return this.settings.save(current ? { ...current, value } : this.settings.create({ key, value })); }
  private async appendAutomaticNotification(input: { kind: string; title: string; text: string; imageUrl: string; href: string }) {
    const setting = await this.settings.findOneBy({ key: 'site-notifications' });
    const items = Array.isArray(setting?.value?.items) ? setting.value.items : [];
    const item = { id: randomUUID(), kind: input.kind, title: { ru: input.title, uz: input.title, en: input.title }, text: { ru: input.text, uz: input.text, en: input.text }, imageUrl: input.imageUrl, href: input.href, createdAt: new Date().toISOString(), isActive: true, clicks: 0, clickVisitorIds: [] };
    await this.settings.save(setting ? { ...setting, value: { ...setting.value, items: [item, ...items] } } : this.settings.create({ key: 'site-notifications', value: { items: [item] } }));
  }
}
