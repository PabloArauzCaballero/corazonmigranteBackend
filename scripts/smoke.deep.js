#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Smoke profundo de integración para Corazón Migrante Backend.
 *
 * Objetivo:
 * - Probar el backend como lo usaría un frontend real.
 * - Validar auth, RBAC, endpoints públicos/privados, citas, catálogo, agenda,
 *   contabilidad, archivos, CMS, analytics, outbox y health DB/Redis.
 * - Detectar datos fragmentados con verificaciones directas opcionales a PostgreSQL.
 *
 * Uso:
 *   yarn smoke:deep
 *   BASE_URL=http://localhost:3000/api/v1 yarn smoke:deep
 *   DEEP_SMOKE_DB=false yarn smoke:deep
 *
 * Requisitos:
 * - Backend levantado: yarn start:dev
 * - DB migrada/seeded: yarn db:reset o yarn db:migrate && yarn db:seed
 * - Node >= 20
 */

require('dotenv').config();
const { Pool } = require('pg');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const DEEP_SMOKE_DB = String(process.env.DEEP_SMOKE_DB || 'true').toLowerCase() !== 'false';
const DEEP_SMOKE_MUTATE = String(process.env.DEEP_SMOKE_MUTATE || 'true').toLowerCase() !== 'false';
const REQUIRE_REDIS_OK = String(process.env.DEEP_SMOKE_REQUIRE_REDIS_OK || 'true').toLowerCase() !== 'false';

const PASSWORD = process.env.SMOKE_PASSWORD || 'Demo123456!';
const CREDS = {
  superadmin: { email: process.env.SMOKE_SUPERADMIN_EMAIL || 'superadmin@corazonmigrante.test', password: PASSWORD },
  admin: { email: process.env.SMOKE_ADMIN_EMAIL || 'admin@corazonmigrante.test', password: PASSWORD },
  accountant: { email: process.env.SMOKE_ACCOUNTANT_EMAIL || 'contador@corazonmigrante.test', password: PASSWORD },
  therapist: { email: process.env.SMOKE_THERAPIST_EMAIL || 'terapeuta.demo@corazonmigrante.test', password: PASSWORD },
  patient: { email: process.env.SMOKE_PATIENT_EMAIL || 'paciente.demo@corazonmigrante.test', password: PASSWORD },
};

const state = {
  startedAt: new Date(),
  suffix: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  tokens: {},
  refreshTokens: {},
  users: {},
  ids: {},
  db: null,
};

const summary = [];

function logStep(title) {
  console.log(`\n▶ ${title}`);
}

function ok(label) {
  summary.push({ label, ok: true });
  console.log(`  ✓ ${label}`);
}

function fail(label, details) {
  const error = new Error(`${label}${details ? `: ${details}` : ''}`);
  error.label = label;
  throw error;
}

function assert(condition, label, details) {
  if (!condition) fail(label, details);
  ok(label);
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

async function api(method, path, options = {}) {
  const {
    token,
    body,
    expected = [200, 201],
    headers = {},
    rawBody,
    query,
  } = options;
  const url = `${BASE_URL}${path}${toQuery(query)}`;
  const finalHeaders = { ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let finalBody;
  if (rawBody !== undefined) {
    finalBody = rawBody;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(url, { method, headers: finalHeaders, body: finalBody });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  const expectedList = Array.isArray(expected) ? expected : [expected];
  if (!expectedList.includes(response.status)) {
    console.error(`\nHTTP inesperado ${method} ${url}`);
    console.error(`Status esperado: ${expectedList.join(', ')}`);
    console.error(`Status recibido: ${response.status}`);
    console.error(JSON.stringify(json, null, 2));
    fail(`${method} ${path}`, `HTTP ${response.status}`);
  }
  return { status: response.status, json, headers: response.headers };
}

async function login(role) {
  const creds = CREDS[role];
  const res = await api('POST', '/auth/login', { body: creds, expected: 201 });
  const data = res.json.data;
  assert(data?.accessToken && data?.refreshToken, `login ${role} devuelve accessToken y refreshToken`);
  state.tokens[role] = data.accessToken;
  state.refreshTokens[role] = data.refreshToken;
  return data;
}

async function dbConnect() {
  if (!DEEP_SMOKE_DB) return null;
  const required = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.warn(`  ! Saltando validación DB directa. Faltan variables: ${missing.join(', ')}`);
    return null;
  }
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: String(process.env.DATABASE_SSL || 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : false,
  });
  await pool.query('SELECT 1');
  state.db = pool;
  ok('conexión directa a PostgreSQL para verificaciones profundas');
  return pool;
}

async function dbOne(sql, params = []) {
  if (!state.db) return null;
  const { rows } = await state.db.query(sql, params);
  return rows[0] || null;
}

async function dbValue(sql, params = []) {
  const row = await dbOne(sql, params);
  if (!row) return null;
  return Object.values(row)[0];
}

async function dbAssertCount(label, sql, params, predicate, detailsFn = (v) => String(v)) {
  if (!state.db) return;
  const value = Number(await dbValue(sql, params));
  assert(predicate(value), `${label} | DB count=${detailsFn(value)}`);
}

async function run() {
  console.log('============================================================');
  console.log(' Smoke profundo - Corazón Migrante Backend');
  console.log('============================================================');
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`DEEP_SMOKE_DB: ${DEEP_SMOKE_DB}`);
  console.log(`DEEP_SMOKE_MUTATE: ${DEEP_SMOKE_MUTATE}`);

  await dbConnect();

  logStep('1. Health profundo: API + DB + Redis');
  const health = await api('GET', '/health', { expected: 200 });
  assert(health.json.data?.status === 'ok', 'health.status = ok');
  assert(health.json.data?.database === 'ok', 'health.database = ok');
  if (REQUIRE_REDIS_OK) {
    assert(health.json.data?.redis === 'ok', 'health.redis = ok', 'Redis debe estar levantado con docker compose up -d redis');
  } else {
    assert(['ok', 'degraded'].includes(health.json.data?.redis), 'health.redis responde ok/degraded');
  }

  logStep('2. Swagger / documentación viva');
  const docs = await fetch(`${BASE_URL.replace(/\/api\/v1$/, '')}/docs`);
  assert([200, 301, 302].includes(docs.status), 'Swagger /docs responde');

  logStep('3. Autenticación por roles + token payload real');
  for (const role of ['superadmin', 'admin', 'accountant', 'therapist', 'patient']) {
    await login(role);
    const me = await api('GET', '/me', { token: state.tokens[role], expected: 200 });
    assert(me.json.data?.email === CREDS[role].email, `/me identifica correctamente a ${role}`);
    assert(Array.isArray(me.json.data?.roles) && me.json.data.roles.length > 0, `/me trae roles de ${role}`);
    state.users[role] = me.json.data;
  }

  logStep('4. Seguridad negativa: no token, token inválido y RBAC');
  await api('GET', '/me', { expected: 401 });
  ok('GET /me sin token rechaza con 401');
  await api('GET', '/me', { token: 'token-invalido', expected: 401 });
  ok('GET /me con token inválido rechaza con 401');
  await api('GET', '/admin/users', { token: state.tokens.patient, expected: 403 });
  ok('paciente no puede listar usuarios admin');
  await api('GET', '/admin/accounting/account-groups', { token: state.tokens.admin, expected: 403 });
  ok('admin operativo sin permiso contable no accede a contabilidad');
  await api('GET', '/admin/users', { token: state.tokens.admin, expected: 200 });
  ok('admin sí puede listar usuarios');

  logStep('5. Validación DTO: payload inválido debe fallar temprano');
  await api('POST', '/auth/register/patient', {
    body: { email: 'correo-malo', password: '123', firstName: '', lastName: '' },
    expected: 400,
  });
  ok('registro paciente inválido devuelve 400');
  await api('POST', '/appointments', {
    token: state.tokens.patient,
    body: { therapistUserId: 'no-uuid', productId: 'no-uuid', scheduledStartAt: 'mala-fecha', timezone: 123 },
    expected: 400,
  });
  ok('creación de cita inválida devuelve 400');

  logStep('6. Catálogo público y admin');
  const publicApproaches = await api('GET', '/therapy/approaches', { expected: 200 });
  const publicProducts = await api('GET', '/therapy/products', { expected: 200 });
  assert(Array.isArray(publicApproaches.json.data) && publicApproaches.json.data.length >= 1, 'catálogo público de enfoques trae datos');
  assert(Array.isArray(publicProducts.json.data) && publicProducts.json.data.length >= 1, 'catálogo público de productos trae datos');
  const approachId = publicApproaches.json.data[0].id;
  const productId = publicProducts.json.data[0].id;
  assert(isUuid(approachId), 'approachId público es UUID');
  assert(isUuid(productId), 'productId público es UUID');
  state.ids.approachId = approachId;
  state.ids.productId = productId;

  const adminProducts = await api('GET', '/admin/therapy/products', { token: state.tokens.admin, expected: 200 });
  assert(Array.isArray(adminProducts.json.data), 'admin puede listar productos terapéuticos');

  if (DEEP_SMOKE_MUTATE) {
    const createdApproach = await api('POST', '/admin/therapy/approaches', {
      token: state.tokens.admin,
      body: {
        name: `Smoke enfoque ${state.suffix}`,
        description: 'Creado por smoke profundo. Puede eliminarse en ambientes de prueba.',
        status: 'ACTIVE',
        sortOrder: 99,
      },
      expected: 201,
    });
    state.ids.createdApproachId = createdApproach.json.data.id;
    assert(isUuid(state.ids.createdApproachId), 'admin crea enfoque terapéutico con UUID');

    const createdProduct = await api('POST', '/admin/therapy/products', {
      token: state.tokens.admin,
      body: {
        approachId: state.ids.createdApproachId,
        name: `Smoke producto ${state.suffix}`,
        description: 'Producto creado por smoke profundo.',
        durationMinutes: 60,
        price: 123,
        currency: 'BOB',
        status: 'ACTIVE',
        sortOrder: 99,
      },
      expected: 201,
    });
    state.ids.createdProductId = createdProduct.json.data.id;
    assert(isUuid(state.ids.createdProductId), 'admin crea producto terapéutico con UUID');
  }

  logStep('7. Agenda y disponibilidad');
  const therapistId = state.users.therapist.id;
  assert(isUuid(therapistId), 'terapeuta demo tiene UUID');
  const schedules = await api('GET', '/therapists/me/schedules', { token: state.tokens.therapist, expected: 200 });
  assert(Array.isArray(schedules.json.data) && schedules.json.data.length >= 1, 'terapeuta lista sus horarios');
  await api('GET', '/therapists/me/schedules', { token: state.tokens.patient, expected: 403 });
  ok('paciente no puede consultar agenda privada del terapeuta');

  const availability = await api('GET', '/booking/availability', {
    expected: 200,
    query: {
      therapistUserId: therapistId,
      productId,
      from: '2026-07-06',
      to: '2026-07-10',
      timezone: 'America/La_Paz',
    },
  });
  assert(Array.isArray(availability.json.data?.slots) && availability.json.data.slots.length >= 1, 'booking availability genera slots reales');
  state.ids.availableSlot = availability.json.data.slots[0];

  if (DEEP_SMOKE_MUTATE) {
    const blockStart = '2026-07-10T10:00:00-04:00';
    const blockEnd = '2026-07-10T11:00:00-04:00';
    const blocked = await api('POST', '/therapists/me/blocked-times', {
      token: state.tokens.therapist,
      body: { startAt: blockStart, endAt: blockEnd, reason: `Smoke block ${state.suffix}` },
      expected: 201,
    });
    assert(isUuid(blocked.json.data?.id), 'terapeuta crea bloqueo horario');
  }

  logStep('8. Citas: creación, listado, transición, outbox y rollback por solapamiento');
  if (DEEP_SMOKE_MUTATE) {
    const slot = state.ids.availableSlot;
    const appointment = await api('POST', '/appointments', {
      token: state.tokens.patient,
      body: {
        therapistUserId: therapistId,
        productId,
        scheduledStartAt: slot.startAt,
        timezone: 'America/La_Paz',
        notesForTherapist: `Smoke appointment ${state.suffix}`,
      },
      expected: 201,
    });
    const appointmentId = appointment.json.data.id;
    state.ids.appointmentId = appointmentId;
    assert(isUuid(appointmentId), 'paciente crea cita REQUESTED');

    await api('POST', '/appointments', {
      token: state.tokens.patient,
      body: {
        therapistUserId: therapistId,
        productId,
        scheduledStartAt: slot.startAt,
        timezone: 'America/La_Paz',
        notesForTherapist: `Smoke overlap ${state.suffix}`,
      },
      expected: 400,
    });
    ok('segunda cita en el mismo slot falla y evita doble reserva');

    const patientAppointments = await api('GET', '/appointments/mine', { token: state.tokens.patient, expected: 200 });
    assert(patientAppointments.json.data.some((x) => x.id === appointmentId), 'paciente ve su cita en /appointments/mine');

    const therapistAppointments = await api('GET', '/appointments/mine', { token: state.tokens.therapist, expected: 200 });
    assert(therapistAppointments.json.data.some((x) => x.id === appointmentId), 'terapeuta ve la cita en /appointments/mine');

    await api('PATCH', `/appointments/${appointmentId}/status`, {
      token: state.tokens.therapist,
      body: { status: 'CONFIRMED', reason: 'Confirmado por smoke profundo' },
      expected: 200,
    });
    ok('terapeuta confirma cita');

    await api('PATCH', `/appointments/${appointmentId}/status`, {
      token: state.tokens.patient,
      body: { status: 'REQUESTED', reason: 'Transición inválida smoke' },
      expected: 400,
    });
    ok('transición inválida de cita devuelve 400');

    if (state.db) {
      await dbAssertCount(
        'cita tiene historial mínimo REQUESTED + CONFIRMED',
        'SELECT COUNT(*)::int AS count FROM appointment_status_history WHERE appointment_id = $1',
        [appointmentId],
        (v) => v >= 2,
      );
      await dbAssertCount(
        'cita generó mensajes outbox',
        "SELECT COUNT(*)::int AS count FROM message_outbox WHERE payload->>'appointmentId' = $1",
        [appointmentId],
        (v) => v >= 1,
      );
      await dbAssertCount(
        'cita generó auditoría',
        "SELECT COUNT(*)::int AS count FROM audit_logs WHERE entity_type = 'Appointment' AND entity_id = $1",
        [appointmentId],
        (v) => v >= 2,
      );
    }
  } else {
    ok('mutaciones de citas omitidas por DEEP_SMOKE_MUTATE=false');
  }

  logStep('9. Registro atómico y no fragmentado');
  if (DEEP_SMOKE_MUTATE) {
    const newPatientEmail = `smoke.patient.${state.suffix}@corazonmigrante.test`.toLowerCase();
    const registered = await api('POST', '/auth/register/patient', {
      body: {
        email: newPatientEmail,
        password: PASSWORD,
        firstName: 'Smoke',
        lastName: 'Paciente',
        phone: '+59170000001',
        birthDate: '1998-01-20',
        country: 'Bolivia',
        city: 'Santa Cruz de la Sierra',
        occupation: 'QA Smoke',
      },
      expected: 201,
    });
    const newPatientId = registered.json.data.id;
    state.ids.newPatientId = newPatientId;
    assert(isUuid(newPatientId), 'registro paciente devuelve user.id');
    const newLogin = await api('POST', '/auth/login', { body: { email: newPatientEmail, password: PASSWORD }, expected: 201 });
    assert(Boolean(newLogin.json.data?.accessToken), 'paciente recién registrado puede iniciar sesión');

    await api('POST', '/auth/register/patient', {
      body: {
        email: newPatientEmail,
        password: PASSWORD,
        firstName: 'Duplicado',
        lastName: 'Smoke',
      },
      expected: 400,
    });
    ok('registro duplicado falla sin crear usuario parcial');

    if (state.db) {
      await dbAssertCount(
        'registro paciente no fragmentado: user + profile + role existen',
        `SELECT COUNT(*)::int AS count
           FROM users u
           JOIN patient_profiles pp ON pp.user_id = u.id
           JOIN user_roles ur ON ur.user_id = u.id
           JOIN roles r ON r.id = ur.role_id AND r.code = 'PATIENT'
          WHERE u.id = $1`,
        [newPatientId],
        (v) => v === 1,
      );
      await dbAssertCount(
        'registro paciente creó bienvenida en outbox',
        "SELECT COUNT(*)::int AS count FROM message_outbox WHERE recipient = $1 AND template_code = 'WELCOME_PATIENT'",
        [newPatientEmail],
        (v) => v >= 1,
      );
      await dbAssertCount(
        'registro duplicado no dejó más de un usuario con mismo email',
        'SELECT COUNT(*)::int AS count FROM users WHERE email = $1',
        [newPatientEmail],
        (v) => v === 1,
      );
    }
  }

  logStep('10. Refresh token y logout');
  const refreshed = await api('POST', '/auth/refresh', {
    body: { refreshToken: state.refreshTokens.patient },
    expected: 201,
  });
  assert(Boolean(refreshed.json.data?.accessToken && refreshed.json.data?.refreshToken), 'refresh devuelve nuevo token pair');
  await api('POST', '/auth/logout', { body: { refreshToken: refreshed.json.data.refreshToken }, expected: 201 });
  ok('logout revoca refresh token');
  await api('POST', '/auth/refresh', { body: { refreshToken: refreshed.json.data.refreshToken }, expected: 401 });
  ok('refresh token revocado ya no sirve');

  logStep('11. Contabilidad: balance, rollback y permisos');
  const groups = await api('GET', '/admin/accounting/account-groups', { token: state.tokens.accountant, expected: 200 });
  assert(Array.isArray(groups.json.data) && groups.json.data.length >= 2, 'contador lista grupos contables');
  const accounts = await api('GET', '/admin/accounting/accounts', { token: state.tokens.accountant, expected: 200 });
  assert(Array.isArray(accounts.json.data) && accounts.json.data.length >= 2, 'contador lista cuentas contables');
  const debitAccount = accounts.json.data.find((a) => a.normalBalance === 'DEBIT') || accounts.json.data[0];
  const creditAccount = accounts.json.data.find((a) => a.normalBalance === 'CREDIT') || accounts.json.data[1];
  assert(isUuid(debitAccount.id) && isUuid(creditAccount.id), 'cuentas contables tienen UUID');

  if (DEEP_SMOKE_MUTATE) {
    await api('POST', '/admin/accounting/transactions', {
      token: state.tokens.accountant,
      body: {
        date: '2026-07-01',
        description: `Smoke transacción desbalanceada ${state.suffix}`,
        reference: `SMOKE-BAD-${state.suffix}`,
        entries: [
          { accountId: debitAccount.id, debit: 100, credit: 0 },
          { accountId: creditAccount.id, debit: 0, credit: 90 },
        ],
      },
      expected: 400,
    });
    ok('transacción desbalanceada falla');
    if (state.db) {
      await dbAssertCount(
        'rollback contable: transacción desbalanceada no deja cabecera',
        'SELECT COUNT(*)::int AS count FROM accounting_transactions WHERE reference = $1',
        [`SMOKE-BAD-${state.suffix}`],
        (v) => v === 0,
      );
    }

    const goodTx = await api('POST', '/admin/accounting/transactions', {
      token: state.tokens.accountant,
      body: {
        date: '2026-07-01',
        description: `Smoke transacción balanceada ${state.suffix}`,
        reference: `SMOKE-OK-${state.suffix}`,
        entries: [
          { accountId: debitAccount.id, debit: 100, credit: 0 },
          { accountId: creditAccount.id, debit: 0, credit: 100 },
        ],
      },
      expected: 201,
    });
    const txId = goodTx.json.data.id;
    assert(isUuid(txId), 'transacción balanceada crea cabecera');
    if (state.db) {
      await dbAssertCount(
        'transacción balanceada tiene dos asientos',
        'SELECT COUNT(*)::int AS count FROM accounting_entries WHERE transaction_id = $1',
        [txId],
        (v) => v === 2,
      );
    }
  }

  logStep('12. CMS público/admin + analytics');
  const page = await api('GET', '/public/pages/inicio', { expected: 200 });
  assert(page.json.data?.slug === 'inicio', 'CMS público devuelve página inicio');
  await api('POST', '/analytics/ui-events', {
    body: { sessionId: `smoke-${state.suffix}`, eventName: 'SMOKE_DEEP_VISIT', payload: { source: 'smoke.deep.js' } },
    expected: 201,
  });
  ok('analytics acepta evento público');
  const uiEvents = await api('GET', '/admin/analytics/ui-events', { token: state.tokens.admin, expected: 200 });
  assert(Array.isArray(uiEvents.json.data), 'admin lista eventos UI');

  if (DEEP_SMOKE_MUTATE) {
    const cmsPage = await api('POST', '/public/pages', {
      token: state.tokens.admin,
      body: {
        slug: `smoke-${state.suffix}`,
        title: `Smoke Page ${state.suffix}`,
        status: 'PUBLISHED',
        seoMetadata: { description: 'Página creada por smoke profundo' },
      },
      expected: 201,
    });
    const cmsPageId = cmsPage.json.data.id;
    assert(isUuid(cmsPageId), 'admin crea página CMS');
    const cmsElement = await api('POST', `/public/pages/${cmsPageId}/elements`, {
      token: state.tokens.admin,
      body: {
        code: 'hero',
        type: 'HERO',
        content: { title: `Smoke Hero ${state.suffix}`, subtitle: 'Validación profunda' },
        sortOrder: 1,
      },
      expected: 201,
    });
    assert(isUuid(cmsElement.json.data.id), 'admin agrega elemento CMS');
    const createdPage = await api('GET', `/public/pages/smoke-${state.suffix}`, { expected: 200 });
    assert(createdPage.json.data?.slug === `smoke-${state.suffix}`, 'página CMS creada queda pública');
  }

  logStep('13. Archivos: upload, ownership y signed URL local/GCS');
  if (DEEP_SMOKE_MUTATE) {
    const form = new FormData();
    const fileContent = Buffer.from(`Smoke PDF fake content ${state.suffix}\n`, 'utf8');
    const blob = new Blob([fileContent], { type: 'application/pdf' });
    form.append('module', 'USER_PROFILE');
    form.append('visibility', 'PRIVATE');
    form.append('file', blob, `smoke-${state.suffix}.pdf`);
    const upload = await api('POST', '/files', {
      token: state.tokens.patient,
      rawBody: form,
      expected: 201,
    });
    const fileId = upload.json.data.id;
    assert(isUuid(fileId), 'paciente sube archivo privado');
    const signed = await api('GET', `/files/${fileId}/signed-url`, { token: state.tokens.patient, expected: 200 });
    assert(Boolean(signed.json.data?.url), 'dueño obtiene signed URL / download info');
    await api('GET', `/files/${fileId}/signed-url`, { token: state.tokens.therapist, expected: 403 });
    ok('otro usuario no puede acceder a archivo privado');
    await api('GET', `/files/${fileId}/signed-url`, { token: state.tokens.admin, expected: 200 });
    ok('admin puede acceder a archivo privado por soporte');

    const badForm = new FormData();
    badForm.append('module', 'USER_PROFILE');
    badForm.append('visibility', 'PRIVATE');
    badForm.append('file', new Blob([Buffer.from('bad')], { type: 'text/plain' }), `bad-${state.suffix}.txt`);
    await api('POST', '/files', { token: state.tokens.patient, rawBody: badForm, expected: 400 });
    ok('archivo MIME no permitido devuelve 400');

    if (state.db) {
      await dbAssertCount(
        'archivo subido tiene metadata y auditoría',
        `SELECT COUNT(*)::int AS count
           FROM files f
           JOIN audit_logs a ON a.entity_id = f.id AND a.entity_type = 'FileAsset'
          WHERE f.id = $1`,
        [fileId],
        (v) => v >= 1,
      );
      await dbAssertCount(
        'signed URL generó access log',
        'SELECT COUNT(*)::int AS count FROM file_access_logs WHERE file_id = $1',
        [fileId],
        (v) => v >= 1,
      );
    }
  }

  logStep('14. Messaging/outbox y auditoría admin');
  const outbox = await api('GET', '/admin/messaging/outbox', { token: state.tokens.admin, expected: 200 });
  assert(Array.isArray(outbox.json.data), 'admin lista outbox');
  await api('POST', '/admin/messaging/outbox/process', { token: state.tokens.admin, expected: [200, 201] });
  ok('admin procesa outbox sin romper');
  const audit = await api('GET', '/admin/audit/logs', { token: state.tokens.admin, expected: 200 });
  assert(Array.isArray(audit.json.data), 'admin lista auditoría');

  logStep('15. Legacy compatibility');
  const legacy = await api('GET', '/legacy/status', { expected: 200 });
  assert(legacy.json.data?.status, 'legacy/status responde para transición frontend');

  if (state.db) {
    logStep('16. Invariantes DB anti-fragmentación globales');
    await dbAssertCount(
      'no hay usuarios PATIENT sin patient_profile',
      `SELECT COUNT(*)::int AS count
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id AND r.code = 'PATIENT'
         LEFT JOIN patient_profiles pp ON pp.user_id = u.id
        WHERE pp.user_id IS NULL`,
      [],
      (v) => v === 0,
    );
    await dbAssertCount(
      'no hay usuarios THERAPIST sin therapist_profile',
      `SELECT COUNT(*)::int AS count
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id AND r.code = 'THERAPIST'
         LEFT JOIN therapist_profiles tp ON tp.user_id = u.id
        WHERE tp.user_id IS NULL`,
      [],
      (v) => v === 0,
    );
    await dbAssertCount(
      'no hay citas sin historial de estado',
      `SELECT COUNT(*)::int AS count
         FROM appointments a
         LEFT JOIN appointment_status_history h ON h.appointment_id = a.id
        WHERE h.appointment_id IS NULL`,
      [],
      (v) => v === 0,
    );
    await dbAssertCount(
      'no hay transacciones contables sin asientos',
      `SELECT COUNT(*)::int AS count
         FROM accounting_transactions t
         LEFT JOIN accounting_entries e ON e.transaction_id = t.id
        WHERE e.transaction_id IS NULL`,
      [],
      (v) => v === 0,
    );
    await dbAssertCount(
      'no hay archivos activos sin owner',
      `SELECT COUNT(*)::int AS count
         FROM files f
         LEFT JOIN users u ON u.id = f.owner_user_id
        WHERE f.status = 'ACTIVE' AND u.id IS NULL`,
      [],
      (v) => v === 0,
    );
  }

  console.log('\n============================================================');
  console.log(' SMOKE PROFUNDO OK');
  console.log('============================================================');
  console.log(`Checks OK: ${summary.length}`);
  console.log(`Duración: ${((Date.now() - state.startedAt.getTime()) / 1000).toFixed(1)}s`);
}

run()
  .catch((error) => {
    console.error('\n============================================================');
    console.error(' SMOKE PROFUNDO FALLÓ');
    console.error('============================================================');
    console.error(error?.stack || error?.message || error);
    console.error('\nSugerencias rápidas:');
    console.error('1) Verifica que el backend esté levantado: yarn start:dev');
    console.error('2) Verifica DB/Redis: docker compose up -d postgres redis');
    console.error('3) Resetea datos demo si hay basura previa: yarn db:reset');
    console.error('4) En Windows usa este script Node; no requiere Bash, WSL ni jq.');
    process.exit(1);
  })
  .finally(async () => {
    if (state.db) await state.db.end().catch(() => undefined);
  });
