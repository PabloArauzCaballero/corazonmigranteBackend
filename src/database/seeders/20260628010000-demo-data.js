'use strict';
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const now = new Date();
const demoPassword = 'Demo123456!';
const jsonb = (value) => JSON.stringify(value);

async function insertReturning(queryInterface, table, rows) {
  await queryInterface.bulkInsert(table, rows, {});
  const [result] = await queryInterface.sequelize.query(`SELECT * FROM ${table};`);
  return result;
}

module.exports = {
  async up(queryInterface) {
    const password_hash = await bcrypt.hash(demoPassword, 10);

    const permissions = [
      'users:read','users:write','therapy:read','therapy:write','scheduling:read','scheduling:write',
      'appointments:read','appointments:write','files:read','files:write','cms:read','cms:write',
      'accounting:read','accounting:write','messaging:read','messaging:write','audit:read','analytics:read'
    ].map((code) => ({ id: randomUUID(), code, description: `Permiso ${code}`, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('permissions', permissions, {});

    const roles = [
      { code: 'SUPER_ADMIN', name: 'Super administrador', description: 'Acceso total' },
      { code: 'ADMIN', name: 'Administrador', description: 'Gestión operativa' },
      { code: 'ACCOUNTANT', name: 'Contador', description: 'Gestión contable' },
      { code: 'THERAPIST', name: 'Terapeuta', description: 'Gestión terapéutica propia' },
      { code: 'PATIENT', name: 'Paciente', description: 'Usuario paciente' },
    ].map((role) => ({ id: randomUUID(), ...role, created_at: now, updated_at: now }));
    await queryInterface.bulkInsert('roles', roles, {});

    const permByCode = Object.fromEntries(permissions.map((p) => [p.code, p]));
    const roleByCode = Object.fromEntries(roles.map((r) => [r.code, r]));
    const rolePermissions = [];
    const grant = (role, codes) => codes.forEach((code) => rolePermissions.push({ role_id: roleByCode[role].id, permission_id: permByCode[code].id }));
    grant('SUPER_ADMIN', permissions.map((p) => p.code));
    grant('ADMIN', permissions.filter((p) => !p.code.startsWith('accounting')).map((p) => p.code));
    grant('ACCOUNTANT', ['accounting:read','accounting:write','audit:read']);
    grant('THERAPIST', ['therapy:read','scheduling:read','scheduling:write','appointments:read','appointments:write','files:read','files:write']);
    grant('PATIENT', ['therapy:read','appointments:read','appointments:write','files:read','files:write']);
    await queryInterface.bulkInsert('role_permissions', rolePermissions, {});

    const users = [
      { id: randomUUID(), email: 'superadmin@corazonmigrante.test', role: 'SUPER_ADMIN', first: 'Super', last: 'Admin' },
      { id: randomUUID(), email: 'admin@corazonmigrante.test', role: 'ADMIN', first: 'Admin', last: 'Demo' },
      { id: randomUUID(), email: 'contador@corazonmigrante.test', role: 'ACCOUNTANT', first: 'Contador', last: 'Demo' },
      { id: randomUUID(), email: 'terapeuta.demo@corazonmigrante.test', role: 'THERAPIST', first: 'Lucía', last: 'Mendoza' },
      { id: randomUUID(), email: 'paciente.demo@corazonmigrante.test', role: 'PATIENT', first: 'Ana', last: 'Rojas' },
    ];
    await queryInterface.bulkInsert('users', users.map((u) => ({ id: u.id, email: u.email, password_hash, status: 'ACTIVE', email_verified_at: now, created_at: now, updated_at: now })), {});
    await queryInterface.bulkInsert('user_roles', users.map((u) => ({ user_id: u.id, role_id: roleByCode[u.role].id })), {});
    await queryInterface.bulkInsert('admin_profiles', users.filter((u) => ['SUPER_ADMIN','ADMIN','ACCOUNTANT'].includes(u.role)).map((u) => ({ user_id: u.id, first_name: u.first, last_name: u.last, level: u.role, created_at: now, updated_at: now })), {});
    const therapist = users.find((u) => u.role === 'THERAPIST');
    const patient = users.find((u) => u.role === 'PATIENT');
    await queryInterface.bulkInsert('therapist_profiles', [{ user_id: therapist.id, first_name: therapist.first, last_name: therapist.last, title: 'Psicóloga', main_specialty: 'Terapia familiar y migración', bio: 'Terapeuta demo para pruebas integrales.', license_number: 'MAT-DEMO-001', country: 'Bolivia', city: 'Santa Cruz de la Sierra', base_session_price: 180, approval_status: 'APPROVED', created_at: now, updated_at: now }], {});
    await queryInterface.bulkInsert('patient_profiles', [{ user_id: patient.id, first_name: patient.first, last_name: patient.last, phone: '+59170000000', country: 'Bolivia', city: 'Santa Cruz de la Sierra', occupation: 'Estudiante', created_at: now, updated_at: now }], {});

    const approachId = randomUUID();
    const productId = randomUUID();
    await queryInterface.bulkInsert('therapy_approaches', [{ id: approachId, name: 'Acompañamiento migrante', slug: 'acompanamiento-migrante', description: 'Apoyo emocional para personas migrantes y sus familias.', status: 'ACTIVE', sort_order: 1, created_at: now, updated_at: now }], {});
    await queryInterface.bulkInsert('therapy_products', [{ id: productId, approach_id: approachId, name: 'Sesión individual online', slug: 'sesion-individual-online', description: 'Sesión terapéutica individual de 60 minutos.', duration_minutes: 60, price: 180, currency: 'BOB', status: 'ACTIVE', sort_order: 1, created_at: now, updated_at: now }], {});
    await queryInterface.bulkInsert('therapist_approaches', [{ therapist_user_id: therapist.id, approach_id: approachId }], {});
    await queryInterface.bulkInsert('therapist_products', [{ therapist_user_id: therapist.id, product_id: productId, custom_price: 180, is_active: true, created_at: now, updated_at: now }], {});
    await queryInterface.bulkInsert('therapist_schedules', [1,2,3,4,5].map((weekday) => ({ id: randomUUID(), therapist_user_id: therapist.id, weekday, start_time: '09:00', end_time: '13:00', timezone: 'America/La_Paz', effective_from: '2026-07-01', status: 'ACTIVE', version: 1, created_at: now, updated_at: now })), {});

    const assetGroup = randomUUID();
    const incomeGroup = randomUUID();
    await queryInterface.bulkInsert('account_groups', [
      { id: assetGroup, code: '1000', name: 'Activos', type: 'ASSET', status: 'ACTIVE', created_at: now, updated_at: now },
      { id: incomeGroup, code: '4000', name: 'Ingresos', type: 'INCOME', status: 'ACTIVE', created_at: now, updated_at: now },
    ], {});
    await queryInterface.bulkInsert('accounts', [
      { id: randomUUID(), group_id: assetGroup, code: '1010', name: 'Caja/Banco', normal_balance: 'DEBIT', status: 'ACTIVE', created_at: now, updated_at: now },
      { id: randomUUID(), group_id: incomeGroup, code: '4010', name: 'Ingresos por sesiones', normal_balance: 'CREDIT', status: 'ACTIVE', created_at: now, updated_at: now },
    ], {});
    await queryInterface.bulkInsert('cost_centers', [{ id: randomUUID(), code: 'CM-TERAPIA', name: 'Terapia Corazón Migrante', status: 'ACTIVE', created_at: now, updated_at: now }], {});

    const pageId = randomUUID();
    await queryInterface.bulkInsert('cms_pages', [{ id: pageId, slug: 'inicio', title: 'Inicio', status: 'PUBLISHED', published_at: now, seo_metadata: jsonb({ description: 'Corazón Migrante' }), created_at: now, updated_at: now }], {});
    await queryInterface.bulkInsert('cms_elements', [{ id: randomUUID(), page_id: pageId, code: 'hero', type: 'HERO', content: jsonb({ title: 'Corazón Migrante', subtitle: 'Acompañamiento emocional para migrantes y familias.' }), sort_order: 1, status: 'ACTIVE', created_at: now, updated_at: now }], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('cms_elements', null, {});
    await queryInterface.bulkDelete('cms_pages', null, {});
    await queryInterface.bulkDelete('cost_centers', null, {});
    await queryInterface.bulkDelete('accounts', null, {});
    await queryInterface.bulkDelete('account_groups', null, {});
    await queryInterface.bulkDelete('therapist_schedules', null, {});
    await queryInterface.bulkDelete('therapist_products', null, {});
    await queryInterface.bulkDelete('therapist_approaches', null, {});
    await queryInterface.bulkDelete('therapy_products', null, {});
    await queryInterface.bulkDelete('therapy_approaches', null, {});
    await queryInterface.bulkDelete('patient_profiles', null, {});
    await queryInterface.bulkDelete('therapist_profiles', null, {});
    await queryInterface.bulkDelete('admin_profiles', null, {});
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};
