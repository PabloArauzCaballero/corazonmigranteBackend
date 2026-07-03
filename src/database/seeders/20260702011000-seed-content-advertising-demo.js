'use strict';
const { randomUUID } = require('crypto');

const jsonb = (value) => JSON.stringify(value);

async function query(qi, sql, replacements = {}) {
  return qi.sequelize.query(sql, { replacements });
}

async function scalar(qi, sql, replacements = {}) {
  const [rows] = await query(qi, sql, replacements);
  return rows?.[0] ?? null;
}

async function ensurePermission(qi, code, now) {
  await query(
    qi,
    `INSERT INTO permissions (id, code, description, created_at, updated_at)
     VALUES (:id, :code, :description, :now, :now)
     ON CONFLICT (code) DO UPDATE
       SET description = EXCLUDED.description,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), code, description: `Permiso ${code}`, now },
  );
  return scalar(qi, 'SELECT id FROM permissions WHERE code = :code', { code });
}

async function ensureRole(qi, code, name, description, now) {
  await query(
    qi,
    `INSERT INTO roles (id, code, name, description, created_at, updated_at)
     VALUES (:id, :code, :name, :description, :now, :now)
     ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), code, name, description, now },
  );
  return scalar(qi, 'SELECT id FROM roles WHERE code = :code', { code });
}

async function grant(qi, roleCode, permissionCodes) {
  const role = await scalar(qi, 'SELECT id FROM roles WHERE code = :roleCode', { roleCode });
  if (!role) return;
  for (const code of permissionCodes) {
    const permission = await scalar(qi, 'SELECT id FROM permissions WHERE code = :code', { code });
    if (!permission) continue;
    await query(
      qi,
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES (:roleId, :permissionId)
       ON CONFLICT DO NOTHING`,
      { roleId: role.id, permissionId: permission.id },
    );
  }
}

async function ensureCategory(qi, now) {
  await query(
    qi,
    `INSERT INTO content_categories (id, slug, name, description, is_active, sort_order, created_at, updated_at)
     VALUES (:id, 'migracion', 'Migración', 'Noticias y recursos para personas migrantes.', true, 1, :now, :now)
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           is_active = EXCLUDED.is_active,
           sort_order = EXCLUDED.sort_order,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), now },
  );
  return scalar(qi, `SELECT id FROM content_categories WHERE slug = 'migracion'`);
}

async function ensureTag(qi, now) {
  await query(
    qi,
    `INSERT INTO content_tags (id, slug, name, created_at, updated_at)
     VALUES (:id, 'historias', 'Historias', :now, :now)
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), now },
  );
  return scalar(qi, `SELECT id FROM content_tags WHERE slug = 'historias'`);
}

async function ensureAuthor(qi, userId, now) {
  const existing = await scalar(
    qi,
    `SELECT id FROM content_authors
     WHERE display_name = 'Equipo Corazón Migrante' AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT 1`,
  );
  if (existing) {
    await query(
      qi,
      `UPDATE content_authors
       SET user_id = COALESCE(user_id, :userId),
           headline = 'Redacción institucional',
           bio = 'Equipo editorial de Corazón Migrante.',
           status = 'ACTIVE',
           updated_at = :now
       WHERE id = :id`,
      { id: existing.id, userId, now },
    );
    return existing;
  }
  const id = randomUUID();
  await query(
    qi,
    `INSERT INTO content_authors (id, user_id, display_name, headline, bio, status, metadata, created_at, updated_at)
     VALUES (:id, :userId, 'Equipo Corazón Migrante', 'Redacción institucional',
             'Equipo editorial de Corazón Migrante.', 'ACTIVE', '{}'::jsonb, :now, :now)`,
    { id, userId, now },
  );
  return { id };
}

async function ensurePublication(qi, publication, now) {
  await query(
    qi,
    `INSERT INTO content_publications
       (id, author_id, category_id, slug, title, summary, body, publication_type, access_type, status, published_at, seo_metadata, created_at, updated_at)
     VALUES
       (:id, :authorId, :categoryId, :slug, :title, :summary, :body, :publicationType, 'PUBLIC', 'PUBLISHED', :now, :seo, :now, :now)
     ON CONFLICT (slug) DO UPDATE
       SET author_id = EXCLUDED.author_id,
           category_id = EXCLUDED.category_id,
           title = EXCLUDED.title,
           summary = EXCLUDED.summary,
           body = EXCLUDED.body,
           publication_type = EXCLUDED.publication_type,
           access_type = EXCLUDED.access_type,
           status = EXCLUDED.status,
           published_at = COALESCE(content_publications.published_at, EXCLUDED.published_at),
           seo_metadata = EXCLUDED.seo_metadata,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), ...publication, now },
  );
  return scalar(qi, 'SELECT id FROM content_publications WHERE slug = :slug', {
    slug: publication.slug,
  });
}

async function ensureCompany(qi, now) {
  const existing = await scalar(
    qi,
    `SELECT id FROM ads_companies
     WHERE business_name = 'Aliado Migrante SRL'
       AND commercial_name = 'Aliado Migrante'
       AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT 1`,
  );
  if (existing) {
    await query(
      qi,
      `UPDATE ads_companies
       SET contact_email = 'contacto@aliadomigrante.test',
           status = 'ACTIVE',
           updated_at = :now
       WHERE id = :id`,
      { id: existing.id, now },
    );
    return existing;
  }
  const id = randomUUID();
  await query(
    qi,
    `INSERT INTO ads_companies (id, business_name, commercial_name, contact_email, status, metadata, created_at, updated_at)
     VALUES (:id, 'Aliado Migrante SRL', 'Aliado Migrante', 'contacto@aliadomigrante.test', 'ACTIVE', '{}'::jsonb, :now, :now)`,
    { id, now },
  );
  return { id };
}

async function ensurePlacement(qi, now) {
  await query(
    qi,
    `INSERT INTO ads_placements (id, code, name, context, is_active, dimensions, created_at, updated_at)
     VALUES (:id, 'home_hero', 'Banner principal de homepage', 'HOME', true, :dimensions, :now, :now)
     ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           context = EXCLUDED.context,
           is_active = EXCLUDED.is_active,
           dimensions = EXCLUDED.dimensions,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), dimensions: jsonb({ width: 1200, height: 360 }), now },
  );
  return scalar(qi, `SELECT id FROM ads_placements WHERE code = 'home_hero'`);
}

async function ensureCampaign(qi, companyId, userId, now) {
  const existing = await scalar(
    qi,
    `SELECT id FROM ads_campaigns
     WHERE company_id = :companyId
       AND name = 'Campaña demo de aliados'
       AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT 1`,
    { companyId },
  );
  if (existing) {
    await query(
      qi,
      `UPDATE ads_campaigns
       SET created_by_user_id = COALESCE(created_by_user_id, :userId),
           objective = 'PUBLIC_SERVICE',
           status = 'ACTIVE',
           starts_at = :startsAt,
           ends_at = :endsAt,
           budget_amount = 0,
           currency = 'BOB',
           priority = 10,
           pacing = 'STANDARD',
           notes = 'Seed demo seguro.',
           updated_at = :now
       WHERE id = :id`,
      {
        id: existing.id,
        userId,
        startsAt: new Date('2026-07-01T00:00:00Z'),
        endsAt: new Date('2027-07-01T00:00:00Z'),
        now,
      },
    );
    return existing;
  }
  const id = randomUUID();
  await query(
    qi,
    `INSERT INTO ads_campaigns
       (id, company_id, created_by_user_id, name, objective, status, starts_at, ends_at, budget_amount, currency, priority, pacing, notes, created_at, updated_at)
     VALUES
       (:id, :companyId, :userId, 'Campaña demo de aliados', 'PUBLIC_SERVICE', 'ACTIVE', :startsAt, :endsAt, 0, 'BOB', 10, 'STANDARD', 'Seed demo seguro.', :now, :now)`,
    {
      id,
      companyId,
      userId,
      startsAt: new Date('2026-07-01T00:00:00Z'),
      endsAt: new Date('2027-07-01T00:00:00Z'),
      now,
    },
  );
  return { id };
}

async function ensureCreative(qi, campaignId, now) {
  const existing = await scalar(
    qi,
    `SELECT id FROM ads_campaign_creatives
     WHERE campaign_id = :campaignId
       AND title = 'Banner demo aliado'
       AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT 1`,
    { campaignId },
  );
  if (existing) {
    await query(
      qi,
      `UPDATE ads_campaign_creatives
       SET media_type = 'IMAGE',
           asset_url = 'https://example.com/demo-banner.webp',
           destination_url = 'https://example.com',
           alt_text = 'Banner demo de aliado migrante',
           mime_type = 'image/webp',
           width = 1200,
           height = 360,
           size_bytes = 0,
           approval_status = 'APPROVED',
           is_primary = true,
           updated_at = :now
       WHERE id = :id`,
      { id: existing.id, now },
    );
    return existing;
  }
  const id = randomUUID();
  await query(
    qi,
    `INSERT INTO ads_campaign_creatives
       (id, campaign_id, title, media_type, asset_url, destination_url, alt_text, mime_type, width, height, size_bytes, approval_status, is_primary, created_at, updated_at)
     VALUES
       (:id, :campaignId, 'Banner demo aliado', 'IMAGE', 'https://example.com/demo-banner.webp', 'https://example.com',
        'Banner demo de aliado migrante', 'image/webp', 1200, 360, 0, 'APPROVED', true, :now, :now)`,
    { id, campaignId, now },
  );
  return { id };
}

async function ensureHomepageSections(qi, now) {
  const sections = [
    { code: 'headlines', title: 'Titulares', type: 'HEADLINES', sortOrder: 1 },
    { code: 'columns', title: 'Columnas', type: 'COLUMNS', sortOrder: 2 },
    { code: 'home_ads', title: 'Aliados', type: 'ADS', sortOrder: 3 },
  ];
  for (const section of sections) {
    await query(
      qi,
      `INSERT INTO homepage_sections (id, code, title, type, sort_order, is_active, metadata, created_at, updated_at)
       VALUES (:id, :code, :title, :type, :sortOrder, true, '{}'::jsonb, :now, :now)
       ON CONFLICT (code) DO UPDATE
         SET title = EXCLUDED.title,
             type = EXCLUDED.type,
             sort_order = EXCLUDED.sort_order,
             is_active = EXCLUDED.is_active,
             updated_at = EXCLUDED.updated_at`,
      { id: randomUUID(), ...section, now },
    );
  }
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const contentPermissions = [
      'content:read',
      'content:write',
      'advertising:read',
      'advertising:write',
      'homepage:read',
      'homepage:write',
    ];

    for (const code of contentPermissions) await ensurePermission(queryInterface, code, now);
    await ensureRole(queryInterface, 'EDITOR', 'Editor de contenido', 'Gestión editorial y publicaciones.', now);
    await ensureRole(
      queryInterface,
      'ADVERTISING_MANAGER',
      'Gestor de publicidad',
      'Gestión de empresas, campañas y piezas publicitarias.',
      now,
    );

    await grant(queryInterface, 'SUPER_ADMIN', contentPermissions);
    await grant(queryInterface, 'ADMIN', contentPermissions);
    await grant(queryInterface, 'EDITOR', ['content:read', 'content:write', 'homepage:read']);
    await grant(queryInterface, 'ADVERTISING_MANAGER', ['advertising:read', 'advertising:write', 'homepage:read']);

    const admin = await scalar(
      queryInterface,
      `SELECT id FROM users WHERE email = 'admin@corazonmigrante.test' LIMIT 1`,
    );
    const category = await ensureCategory(queryInterface, now);
    const tag = await ensureTag(queryInterface, now);
    const author = await ensureAuthor(queryInterface, admin?.id ?? null, now);

    const article = await ensurePublication(
      queryInterface,
      {
        authorId: author.id,
        categoryId: category.id,
        slug: 'guia-inicial-para-migrantes',
        title: 'Guía inicial para migrantes',
        summary: 'Información práctica para iniciar un proceso migratorio con acompañamiento y cuidado.',
        body: 'Esta publicación demo muestra cómo Corazón Migrante absorbe la lógica editorial de Newspaper sin duplicar usuarios, autenticación ni auditoría.',
        publicationType: 'NEWS',
        seo: jsonb({ description: 'Guía inicial para migrantes' }),
      },
      now,
    );

    await ensurePublication(
      queryInterface,
      {
        authorId: author.id,
        categoryId: category.id,
        slug: 'columna-acompanar-sin-juzgar',
        title: 'Acompañar sin juzgar',
        summary: 'Una columna demo sobre acompañamiento humano en procesos migratorios.',
        body: 'Las columnas viven en el mismo dominio de contenido, pero se filtran por tipo para mantener responsabilidades claras.',
        publicationType: 'COLUMN',
        seo: jsonb({}),
      },
      now,
    );

    await query(
      queryInterface,
      `INSERT INTO content_publication_tags (publication_id, tag_id)
       VALUES (:publicationId, :tagId)
       ON CONFLICT DO NOTHING`,
      { publicationId: article.id, tagId: tag.id },
    );

    const company = await ensureCompany(queryInterface, now);
    const placement = await ensurePlacement(queryInterface, now);
    const campaign = await ensureCampaign(queryInterface, company.id, admin?.id ?? null, now);
    await ensureCreative(queryInterface, campaign.id, now);

    await query(
      queryInterface,
      `INSERT INTO ads_campaign_placements (campaign_id, placement_id)
       VALUES (:campaignId, :placementId)
       ON CONFLICT DO NOTHING`,
      { campaignId: campaign.id, placementId: placement.id },
    );

    await ensureHomepageSections(queryInterface, now);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE code IN ('content:read','content:write','advertising:read','advertising:write','homepage:read','homepage:write'));
DELETE FROM homepage_featured_items WHERE section_id IN (SELECT id FROM homepage_sections WHERE code IN ('headlines','columns','home_ads'));
DELETE FROM homepage_sections WHERE code IN ('headlines','columns','home_ads');
DELETE FROM ads_campaign_placements WHERE campaign_id IN (SELECT id FROM ads_campaigns WHERE name = 'Campaña demo de aliados');
DELETE FROM ads_campaign_creatives WHERE campaign_id IN (SELECT id FROM ads_campaigns WHERE name = 'Campaña demo de aliados') AND title = 'Banner demo aliado';
DELETE FROM ads_campaigns WHERE name = 'Campaña demo de aliados';
DELETE FROM ads_placements WHERE code = 'home_hero';
DELETE FROM ads_companies WHERE business_name = 'Aliado Migrante SRL' AND commercial_name = 'Aliado Migrante';
DELETE FROM content_publication_tags WHERE publication_id IN (SELECT id FROM content_publications WHERE slug IN ('guia-inicial-para-migrantes','columna-acompanar-sin-juzgar'));
DELETE FROM content_publications WHERE slug IN ('guia-inicial-para-migrantes','columna-acompanar-sin-juzgar');
DELETE FROM content_tags WHERE slug = 'historias';
DELETE FROM content_categories WHERE slug = 'migracion';
DELETE FROM content_authors WHERE display_name = 'Equipo Corazón Migrante';
DELETE FROM permissions WHERE code IN ('content:read','content:write','advertising:read','advertising:write','homepage:read','homepage:write');
DELETE FROM roles WHERE code IN ('EDITOR','ADVERTISING_MANAGER');
`);
  },
};
