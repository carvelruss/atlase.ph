import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_helpers';

/** Media metadata. Binary data lives in R2; only the object key/metadata is in D1. */
export const mediaAssets = sqliteTable(
  'media_assets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    objectKey: text('object_key').notNull(), // R2 key, e.g. store/production/products/1/uuid.webp
    url: text('url').notNull(), // resolved public URL
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    width: integer('width'),
    height: integer('height'),
    altText: text('alt_text'),
    folder: text('folder').notNull().default('uploads'),
    // Reference count so in-use assets are protected from deletion.
    refCount: integer('ref_count').notNull().default(0),
    uploadedBy: integer('uploaded_by'),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_media_assets_key').on(t.objectKey)],
);

export const pages = sqliteTable(
  'pages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    content: text('content'), // rich text HTML
    template: text('template').notNull().default('default'),
    status: text('status').notNull().default('draft'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ogImageAssetId: integer('og_image_asset_id'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_pages_slug').on(t.slug)],
);

export const blogCategories = sqliteTable(
  'blog_categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_blog_categories_slug').on(t.slug)],
);

export const blogPosts = sqliteTable(
  'blog_posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    overview: text('overview'),
    body: text('body'), // rich text HTML
    featuredImageAssetId: integer('featured_image_asset_id'),
    imageCaption: text('image_caption'),
    author: text('author'),
    categoryId: integer('category_id').references(() => blogCategories.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('draft'),
    readTimeMinutes: integer('read_time_minutes'),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ogImageAssetId: integer('og_image_asset_id'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_blog_posts_slug').on(t.slug),
    index('idx_blog_posts_status').on(t.status),
  ],
);

export const blogTags = sqliteTable(
  'blog_tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
  },
  (t) => [uniqueIndex('idx_blog_tags_slug').on(t.slug)],
);

export const blogPostTags = sqliteTable(
  'blog_post_tags',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => blogTags.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('idx_blog_post_tags_pk').on(t.postId, t.tagId)],
);

export const menus = sqliteTable(
  'menus',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    handle: text('handle').notNull(), // header | footer-1 | footer-2 ...
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_menus_handle').on(t.handle)],
);

export const menuItems = sqliteTable(
  'menu_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    menuId: integer('menu_id')
      .notNull()
      .references(() => menus.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id'),
    label: text('label').notNull(),
    // Link target: internal path, category/collection/page ref, or external url.
    linkType: text('link_type').notNull().default('url'), // url | page | category | collection
    url: text('url'),
    refId: integer('ref_id'),
    position: integer('position').notNull().default(0),
    isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [index('idx_menu_items_menu').on(t.menuId)],
);

/** Ordered, section-based homepage. Each row is one configurable section. */
export const homepageSections = sqliteTable(
  'homepage_sections',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(), // hero | featured_products | testimonials | ...
    position: integer('position').notNull().default(0),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
    // Section-specific configuration + draft copy stored as structured JSON.
    settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
    draftSettings: text('draft_settings', { mode: 'json' }).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [index('idx_homepage_sections_position').on(t.position)],
);
