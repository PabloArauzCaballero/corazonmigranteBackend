'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryInterface.sequelize.query(`
CREATE TABLE IF NOT EXISTS content_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  display_name VARCHAR(180) NOT NULL,
  headline VARCHAR(220) NULL,
  bio TEXT NULL,
  avatar_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE INDEX IF NOT EXISTS content_authors_status_idx ON content_authors(status);
CREATE INDEX IF NOT EXISTS content_authors_user_idx ON content_authors(user_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS content_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(140) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS content_categories_active_sort_idx ON content_categories(is_active, sort_order, name);

CREATE TABLE IF NOT EXISTS content_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS content_publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES content_authors(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES content_categories(id) ON DELETE RESTRICT,
  cover_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  slug VARCHAR(240) NOT NULL UNIQUE,
  title VARCHAR(220) NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  audio_transcript TEXT NULL,
  publication_type VARCHAR(40) NOT NULL DEFAULT 'NEWS',
  access_type VARCHAR(40) NOT NULL DEFAULT 'PUBLIC',
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  comments_enabled BOOLEAN NOT NULL DEFAULT true,
  reactions_enabled BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NULL,
  scheduled_at TIMESTAMPTZ NULL,
  seo_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (publication_type IN ('NEWS','COLUMN','OPINION','INTERVIEW','REPORT','ANALYSIS')),
  CHECK (access_type IN ('PUBLIC','PREMIUM','INTERNAL_ONLY')),
  CHECK (status IN ('DRAFT','IN_REVIEW','SCHEDULED','PUBLISHED','ARCHIVED')),
  CHECK ((status = 'PUBLISHED' AND published_at IS NOT NULL) OR status <> 'PUBLISHED')
);
CREATE INDEX IF NOT EXISTS content_publications_public_idx ON content_publications(status, access_type, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS content_publications_category_idx ON content_publications(category_id, status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS content_publications_type_idx ON content_publications(publication_type, status, published_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS content_publication_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publication_id UUID NOT NULL REFERENCES content_publications(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES content_tags(id) ON DELETE CASCADE,
  UNIQUE(publication_id, tag_id)
);
CREATE INDEX IF NOT EXISTS content_publication_tags_tag_idx ON content_publication_tags(tag_id);

CREATE TABLE IF NOT EXISTS ads_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(180) NOT NULL,
  commercial_name VARCHAR(180) NOT NULL,
  tax_id VARCHAR(40) NULL,
  contact_name VARCHAR(180) NULL,
  contact_email VARCHAR(180) NULL,
  contact_phone VARCHAR(40) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (status IN ('ACTIVE','INACTIVE','BLOCKED'))
);
CREATE INDEX IF NOT EXISTS ads_companies_status_name_idx ON ads_companies(status, commercial_name) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ads_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(140) NOT NULL,
  description TEXT NULL,
  context VARCHAR(40) NOT NULL DEFAULT 'HOME',
  is_active BOOLEAN NOT NULL DEFAULT true,
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (context IN ('HOME','ARTICLE','CATEGORY'))
);
CREATE INDEX IF NOT EXISTS ads_placements_active_context_idx ON ads_placements(is_active, context) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ads_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES ads_companies(id) ON DELETE RESTRICT,
  created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(180) NOT NULL,
  objective VARCHAR(40) NOT NULL DEFAULT 'AWARENESS',
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  budget_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (budget_amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority BETWEEN 1 AND 1000),
  pacing VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (objective IN ('AWARENESS','TRAFFIC','PUBLIC_SERVICE','SPONSORSHIP')),
  CHECK (status IN ('DRAFT','ACTIVE','PAUSED','ENDED','CANCELLED','REJECTED')),
  CHECK (pacing IN ('STANDARD','ACCELERATED','MANUAL')),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS ads_campaigns_delivery_idx ON ads_campaigns(status, starts_at, ends_at, priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ads_campaigns_company_idx ON ads_campaigns(company_id, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ads_campaign_creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  media_type VARCHAR(40) NOT NULL DEFAULT 'IMAGE',
  asset_url VARCHAR(800) NOT NULL,
  destination_url VARCHAR(800) NOT NULL,
  alt_text VARCHAR(220) NOT NULL,
  mime_type VARCHAR(120) NULL,
  width INTEGER NULL CHECK (width IS NULL OR width > 0),
  height INTEGER NULL CHECK (height IS NULL OR height > 0),
  size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  approval_status VARCHAR(40) NOT NULL DEFAULT 'APPROVED',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (media_type IN ('IMAGE','VIDEO','HTML','NATIVE_CARD')),
  CHECK (approval_status IN ('PENDING_REVIEW','APPROVED','REJECTED'))
);
CREATE INDEX IF NOT EXISTS ads_creatives_campaign_status_idx ON ads_campaign_creatives(campaign_id, approval_status, is_primary) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ads_campaign_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  placement_id UUID NOT NULL REFERENCES ads_placements(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, placement_id)
);
CREATE INDEX IF NOT EXISTS ads_campaign_placements_placement_idx ON ads_campaign_placements(placement_id);

CREATE TABLE IF NOT EXISTS ads_campaign_content_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  publication_id UUID NULL REFERENCES content_publications(id) ON DELETE CASCADE,
  category_id UUID NULL REFERENCES content_categories(id) ON DELETE CASCADE,
  targeting_mode VARCHAR(20) NOT NULL DEFAULT 'INCLUDE',
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (targeting_mode IN ('INCLUDE','EXCLUDE')),
  CHECK (publication_id IS NOT NULL OR category_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ads_content_targets_publication_idx ON ads_campaign_content_targets(publication_id, targeting_mode);
CREATE INDEX IF NOT EXISTS ads_content_targets_category_idx ON ads_campaign_content_targets(category_id, targeting_mode);

CREATE TABLE IF NOT EXISTS ads_impressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creative_id UUID NOT NULL REFERENCES ads_campaign_creatives(id) ON DELETE CASCADE,
  publication_id UUID NULL REFERENCES content_publications(id) ON DELETE SET NULL,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  placement_code VARCHAR(80) NULL,
  rendered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ads_impressions_creative_time_idx ON ads_impressions(creative_id, rendered_at DESC);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(140) NOT NULL,
  type VARCHAR(40) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (type IN ('HEADLINES','COLUMNS','ADS','CUSTOM'))
);
CREATE INDEX IF NOT EXISTS homepage_sections_active_sort_idx ON homepage_sections(is_active, sort_order) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS homepage_featured_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
  item_type VARCHAR(40) NOT NULL,
  item_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK (item_type IN ('CONTENT_PUBLICATION','ADS_CAMPAIGN','ADS_CREATIVE')),
  CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE INDEX IF NOT EXISTS homepage_featured_items_section_idx ON homepage_featured_items(section_id, status, sort_order) WHERE deleted_at IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
DROP TABLE IF EXISTS homepage_featured_items;
DROP TABLE IF EXISTS homepage_sections;
DROP TABLE IF EXISTS ads_impressions;
DROP TABLE IF EXISTS ads_campaign_content_targets;
DROP TABLE IF EXISTS ads_campaign_placements;
DROP TABLE IF EXISTS ads_campaign_creatives;
DROP TABLE IF EXISTS ads_campaigns;
DROP TABLE IF EXISTS ads_placements;
DROP TABLE IF EXISTS ads_companies;
DROP TABLE IF EXISTS content_publication_tags;
DROP TABLE IF EXISTS content_publications;
DROP TABLE IF EXISTS content_tags;
DROP TABLE IF EXISTS content_categories;
DROP TABLE IF EXISTS content_authors;
    `);
  },
};
