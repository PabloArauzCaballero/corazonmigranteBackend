'use strict';
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const demoPassword = 'Demo123456!';
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
  return scalar(qi, 'SELECT id, code FROM permissions WHERE code = :code', { code });
}

async function ensureRole(qi, role, now) {
  await query(
    qi,
    `INSERT INTO roles (id, code, name, description, created_at, updated_at)
     VALUES (:id, :code, :name, :description, :now, :now)
     ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), ...role, now },
  );
  return scalar(qi, 'SELECT id, code FROM roles WHERE code = :code', { code: role.code });
}

async function grantPermissions(qi, roleId, permissionIds) {
  for (const permissionId of permissionIds) {
    await query(
      qi,
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES (:roleId, :permissionId)
       ON CONFLICT DO NOTHING`,
      { roleId, permissionId },
    );
  }
}

async function ensureUser(qi, user, passwordHash, now) {
  const existing = await scalar(
    qi,
    `SELECT id FROM users WHERE lower(email) = lower(:email) AND deleted_at IS NULL LIMIT 1`,
    { email: user.email },
  );
  if (existing) return existing;

  await query(
    qi,
    `INSERT INTO users (id, email, password_hash, status, email_verified_at, created_at, updated_at)
     VALUES (:id, :email, :passwordHash, 'ACTIVE', :now, :now, :now)`,
    { id: user.id, email: user.email, passwordHash, now },
  );
  return { id: user.id };
}

async function ensureUserRole(qi, userId, roleId) {
  await query(
    qi,
    `INSERT INTO user_roles (user_id, role_id)
     VALUES (:userId, :roleId)
     ON CONFLICT DO NOTHING`,
    { userId, roleId },
  );
}

async function ensureAdminProfile(qi, user, now) {
  await query(
    qi,
    `INSERT INTO admin_profiles (user_id, first_name, last_name, level, created_at, updated_at)
     VALUES (:userId, :firstName, :lastName, :level, :now, :now)
     ON CONFLICT (user_id) DO UPDATE
       SET first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           level = EXCLUDED.level,
           updated_at = EXCLUDED.updated_at`,
    { userId: user.id, firstName: user.first, lastName: user.last, level: user.role, now },
  );
}

async function ensureTherapistProfile(qi, user, now) {
  await query(
    qi,
    `INSERT INTO therapist_profiles
       (user_id, first_name, last_name, title, main_specialty, bio, license_number, country, city, base_session_price, approval_status, created_at, updated_at)
     VALUES
       (:userId, :firstName, :lastName, 'Psicóloga', 'Terapia familiar y migración',
        'Terapeuta demo para pruebas integrales.', 'MAT-DEMO-001', 'Bolivia', 'Santa Cruz de la Sierra', 180, 'APPROVED', :now, :now)
     ON CONFLICT (user_id) DO UPDATE
       SET first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           title = EXCLUDED.title,
           main_specialty = EXCLUDED.main_specialty,
           bio = EXCLUDED.bio,
           license_number = EXCLUDED.license_number,
           country = EXCLUDED.country,
           city = EXCLUDED.city,
           base_session_price = EXCLUDED.base_session_price,
           approval_status = EXCLUDED.approval_status,
           updated_at = EXCLUDED.updated_at`,
    { userId: user.id, firstName: user.first, lastName: user.last, now },
  );
}

async function ensurePatientProfile(qi, user, now) {
  await query(
    qi,
    `INSERT INTO patient_profiles
       (user_id, first_name, last_name, phone, country, city, occupation, created_at, updated_at)
     VALUES
       (:userId, :firstName, :lastName, '+59170000000', 'Bolivia', 'Santa Cruz de la Sierra', 'Estudiante', :now, :now)
     ON CONFLICT (user_id) DO UPDATE
       SET first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone = EXCLUDED.phone,
           country = EXCLUDED.country,
           city = EXCLUDED.city,
           occupation = EXCLUDED.occupation,
           updated_at = EXCLUDED.updated_at`,
    { userId: user.id, firstName: user.first, lastName: user.last, now },
  );
}

async function ensureTherapyApproach(qi, now) {
  await query(
    qi,
    `INSERT INTO therapy_approaches (id, name, slug, description, status, sort_order, created_at, updated_at)
     VALUES (:id, 'Acompañamiento migrante', 'acompanamiento-migrante',
             'Apoyo emocional para personas migrantes y sus familias.', 'ACTIVE', 1, :now, :now)
     ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           sort_order = EXCLUDED.sort_order,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), now },
  );
  return scalar(qi, `SELECT id FROM therapy_approaches WHERE slug = 'acompanamiento-migrante'`);
}

async function ensureTherapyProduct(qi, approachId, now) {
  await query(
    qi,
    `INSERT INTO therapy_products
       (id, approach_id, name, slug, description, duration_minutes, price, currency, status, sort_order, created_at, updated_at)
     VALUES
       (:id, :approachId, 'Sesión individual online', 'sesion-individual-online',
        'Sesión terapéutica individual de 60 minutos.', 60, 180, 'BOB', 'ACTIVE', 1, :now, :now)
     ON CONFLICT (slug) DO UPDATE
       SET approach_id = EXCLUDED.approach_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           duration_minutes = EXCLUDED.duration_minutes,
           price = EXCLUDED.price,
           currency = EXCLUDED.currency,
           status = EXCLUDED.status,
           sort_order = EXCLUDED.sort_order,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), approachId, now },
  );
  return scalar(qi, `SELECT id FROM therapy_products WHERE slug = 'sesion-individual-online'`);
}

async function ensureTherapistCatalogLinks(qi, therapistId, approachId, productId, now) {
  await query(
    qi,
    `INSERT INTO therapist_approaches (therapist_user_id, approach_id)
     VALUES (:therapistId, :approachId)
     ON CONFLICT DO NOTHING`,
    { therapistId, approachId },
  );
  await query(
    qi,
    `INSERT INTO therapist_products (therapist_user_id, product_id, custom_price, is_active, created_at, updated_at)
     VALUES (:therapistId, :productId, 180, true, :now, :now)
     ON CONFLICT (therapist_user_id, product_id) DO UPDATE
       SET custom_price = EXCLUDED.custom_price,
           is_active = EXCLUDED.is_active,
           updated_at = EXCLUDED.updated_at`,
    { therapistId, productId, now },
  );
}

async function ensureTherapistSchedules(qi, therapistId, now) {
  for (const weekday of [1, 2, 3, 4, 5]) {
    const existing = await scalar(
      qi,
      `SELECT id FROM therapist_schedules
       WHERE therapist_user_id = :therapistId
         AND weekday = :weekday
         AND start_time = '09:00'
         AND end_time = '13:00'
         AND effective_from = '2026-07-01'
         AND deleted_at IS NULL
       LIMIT 1`,
      { therapistId, weekday },
    );
    if (existing) continue;
    await query(
      qi,
      `INSERT INTO therapist_schedules
         (id, therapist_user_id, weekday, start_time, end_time, timezone, effective_from, status, version, created_at, updated_at)
       VALUES
         (:id, :therapistId, :weekday, '09:00', '13:00', 'America/La_Paz', '2026-07-01', 'ACTIVE', 1, :now, :now)`,
      { id: randomUUID(), therapistId, weekday, now },
    );
  }
}

async function ensureAccountGroup(qi, group, now) {
  await query(
    qi,
    `INSERT INTO account_groups (id, code, name, type, status, created_at, updated_at)
     VALUES (:id, :code, :name, :type, 'ACTIVE', :now, :now)
     ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           type = EXCLUDED.type,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), ...group, now },
  );
  return scalar(qi, 'SELECT id FROM account_groups WHERE code = :code', { code: group.code });
}

async function ensureAccount(qi, account, now) {
  await query(
    qi,
    `INSERT INTO accounts (id, group_id, code, name, normal_balance, status, created_at, updated_at)
     VALUES (:id, :groupId, :code, :name, :normalBalance, 'ACTIVE', :now, :now)
     ON CONFLICT (code) DO UPDATE
       SET group_id = EXCLUDED.group_id,
           name = EXCLUDED.name,
           normal_balance = EXCLUDED.normal_balance,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), ...account, now },
  );
}

async function ensureCostCenter(qi, now) {
  await query(
    qi,
    `INSERT INTO cost_centers (id, code, name, status, created_at, updated_at)
     VALUES (:id, 'CM-TERAPIA', 'Terapia Corazón Migrante', 'ACTIVE', :now, :now)
     ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), now },
  );
}

async function ensureCmsPage(qi, now) {
  await query(
    qi,
    `INSERT INTO cms_pages (id, slug, title, status, published_at, seo_metadata, created_at, updated_at)
     VALUES (:id, 'inicio', 'Inicio', 'PUBLISHED', :now, :seo, :now, :now)
     ON CONFLICT (slug) DO UPDATE
       SET title = EXCLUDED.title,
           status = EXCLUDED.status,
           published_at = EXCLUDED.published_at,
           seo_metadata = EXCLUDED.seo_metadata,
           updated_at = EXCLUDED.updated_at`,
    { id: randomUUID(), seo: jsonb({ description: 'Corazón Migrante' }), now },
  );
  return scalar(qi, `SELECT id FROM cms_pages WHERE slug = 'inicio'`);
}

async function ensureCmsHero(qi, pageId, now) {
  const content = jsonb({
    title: 'Corazón Migrante',
    subtitle: 'Acompañamiento emocional para migrantes y familias.',
  });
  const existing = await scalar(
    qi,
    `SELECT id FROM cms_elements WHERE page_id = :pageId AND code = 'hero' AND deleted_at IS NULL LIMIT 1`,
    { pageId },
  );
  if (existing) {
    await query(
      qi,
      `UPDATE cms_elements
       SET type = 'HERO', content = :content, sort_order = 1, status = 'ACTIVE', updated_at = :now
       WHERE id = :id`,
      { id: existing.id, content, now },
    );
    return;
  }
  await query(
    qi,
    `INSERT INTO cms_elements (id, page_id, code, type, content, sort_order, status, created_at, updated_at)
     VALUES (:id, :pageId, 'hero', 'HERO', :content, 1, 'ACTIVE', :now, :now)`,
    { id: randomUUID(), pageId, content, now },
  );
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash(demoPassword, 10);

    const permissionCodes = [
      'users:read',
      'users:write',
      'therapy:read',
      'therapy:write',
      'scheduling:read',
      'scheduling:write',
      'appointments:read',
      'appointments:write',
      'files:read',
      'files:write',
      'cms:read',
      'cms:write',
      'accounting:read',
      'accounting:write',
      'messaging:read',
      'messaging:write',
      'audit:read',
      'analytics:read',
    ];

    const roles = [
      { code: 'SUPER_ADMIN', name: 'Super administrador', description: 'Acceso total' },
      { code: 'ADMIN', name: 'Administrador', description: 'Gestión operativa' },
      { code: 'ACCOUNTANT', name: 'Contador', description: 'Gestión contable' },
      { code: 'THERAPIST', name: 'Terapeuta', description: 'Gestión terapéutica propia' },
      { code: 'PATIENT', name: 'Paciente', description: 'Usuario paciente' },
    ];

    const permissions = {};
    for (const code of permissionCodes) permissions[code] = await ensurePermission(queryInterface, code, now);

    const roleByCode = {};
    for (const role of roles) roleByCode[role.code] = await ensureRole(queryInterface, role, now);

    const permissionIds = (codes) => codes.map((code) => permissions[code].id);
    await grantPermissions(queryInterface, roleByCode.SUPER_ADMIN.id, permissionIds(permissionCodes));
    await grantPermissions(
      queryInterface,
      roleByCode.ADMIN.id,
      permissionIds(permissionCodes.filter((code) => !code.startsWith('accounting'))),
    );
    await grantPermissions(
      queryInterface,
      roleByCode.ACCOUNTANT.id,
      permissionIds(['accounting:read', 'accounting:write', 'audit:read']),
    );
    await grantPermissions(
      queryInterface,
      roleByCode.THERAPIST.id,
      permissionIds([
        'therapy:read',
        'scheduling:read',
        'scheduling:write',
        'appointments:read',
        'appointments:write',
        'files:read',
        'files:write',
      ]),
    );
    await grantPermissions(
      queryInterface,
      roleByCode.PATIENT.id,
      permissionIds(['therapy:read', 'appointments:read', 'appointments:write', 'files:read', 'files:write']),
    );

    const users = [
      { email: 'superadmin@corazonmigrante.test', role: 'SUPER_ADMIN', first: 'Super', last: 'Admin' },
      { email: 'admin@corazonmigrante.test', role: 'ADMIN', first: 'Admin', last: 'Demo' },
      { email: 'contador@corazonmigrante.test', role: 'ACCOUNTANT', first: 'Contador', last: 'Demo' },
      { email: 'terapeuta.demo@corazonmigrante.test', role: 'THERAPIST', first: 'Lucía', last: 'Mendoza' },
      { email: 'paciente.demo@corazonmigrante.test', role: 'PATIENT', first: 'Ana', last: 'Rojas' },
    ];

    for (const user of users) {
      const ensured = await ensureUser(queryInterface, { ...user, id: randomUUID() }, passwordHash, now);
      user.id = ensured.id;
      await ensureUserRole(queryInterface, user.id, roleByCode[user.role].id);
    }

    for (const user of users.filter((u) => ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(u.role))) {
      await ensureAdminProfile(queryInterface, user, now);
    }

    const therapist = users.find((u) => u.role === 'THERAPIST');
    const patient = users.find((u) => u.role === 'PATIENT');
    await ensureTherapistProfile(queryInterface, therapist, now);
    await ensurePatientProfile(queryInterface, patient, now);

    const approach = await ensureTherapyApproach(queryInterface, now);
    const product = await ensureTherapyProduct(queryInterface, approach.id, now);
    await ensureTherapistCatalogLinks(queryInterface, therapist.id, approach.id, product.id, now);
    await ensureTherapistSchedules(queryInterface, therapist.id, now);

    const assetGroup = await ensureAccountGroup(queryInterface, { code: '1000', name: 'Activos', type: 'ASSET' }, now);
    const incomeGroup = await ensureAccountGroup(queryInterface, { code: '4000', name: 'Ingresos', type: 'INCOME' }, now);
    await ensureAccount(
      queryInterface,
      { groupId: assetGroup.id, code: '1010', name: 'Caja/Banco', normalBalance: 'DEBIT' },
      now,
    );
    await ensureAccount(
      queryInterface,
      { groupId: incomeGroup.id, code: '4010', name: 'Ingresos por sesiones', normalBalance: 'CREDIT' },
      now,
    );
    await ensureCostCenter(queryInterface, now);

    const page = await ensureCmsPage(queryInterface, now);
    await ensureCmsHero(queryInterface, page.id, now);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
DELETE FROM cms_elements WHERE page_id IN (SELECT id FROM cms_pages WHERE slug = 'inicio') AND code = 'hero';
DELETE FROM cms_pages WHERE slug = 'inicio';
DELETE FROM cost_centers WHERE code = 'CM-TERAPIA';
DELETE FROM accounts WHERE code IN ('1010','4010');
DELETE FROM account_groups WHERE code IN ('1000','4000');
DELETE FROM therapist_schedules
 WHERE therapist_user_id IN (SELECT id FROM users WHERE email = 'terapeuta.demo@corazonmigrante.test')
   AND start_time = '09:00'
   AND end_time = '13:00'
   AND effective_from = '2026-07-01';
DELETE FROM therapist_products WHERE product_id IN (SELECT id FROM therapy_products WHERE slug = 'sesion-individual-online');
DELETE FROM therapist_approaches WHERE approach_id IN (SELECT id FROM therapy_approaches WHERE slug = 'acompanamiento-migrante');
DELETE FROM therapy_products WHERE slug = 'sesion-individual-online';
DELETE FROM therapy_approaches WHERE slug = 'acompanamiento-migrante';
DELETE FROM patient_profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'paciente.demo@corazonmigrante.test');
DELETE FROM therapist_profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'terapeuta.demo@corazonmigrante.test');
DELETE FROM admin_profiles WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('superadmin@corazonmigrante.test','admin@corazonmigrante.test','contador@corazonmigrante.test')
);
DELETE FROM user_roles WHERE user_id IN (
  SELECT id FROM users WHERE email IN (
    'superadmin@corazonmigrante.test',
    'admin@corazonmigrante.test',
    'contador@corazonmigrante.test',
    'terapeuta.demo@corazonmigrante.test',
    'paciente.demo@corazonmigrante.test'
  )
);
DELETE FROM users WHERE email IN (
  'superadmin@corazonmigrante.test',
  'admin@corazonmigrante.test',
  'contador@corazonmigrante.test',
  'terapeuta.demo@corazonmigrante.test',
  'paciente.demo@corazonmigrante.test'
);
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE code IN ('SUPER_ADMIN','ADMIN','ACCOUNTANT','THERAPIST','PATIENT'));
DELETE FROM roles WHERE code IN ('SUPER_ADMIN','ADMIN','ACCOUNTANT','THERAPIST','PATIENT');
DELETE FROM permissions WHERE code IN (
  'users:read','users:write','therapy:read','therapy:write','scheduling:read','scheduling:write',
  'appointments:read','appointments:write','files:read','files:write','cms:read','cms:write',
  'accounting:read','accounting:write','messaging:read','messaging:write','audit:read','analytics:read'
);
`);
  },
};
