#!/usr/bin/env node
/*
 * Smoke profundo clasico Node.js para Corazon Migrante Backend.
 * No requiere Bash, WSL, jq ni curl. Funciona en Windows, Linux y macOS.
 *
 * Uso:
 *   yarn smoke:deep
 *   yarn smoke:deep -- --mutations
 *   yarn smoke:deep -- --mutations --external
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flags = new Set(args);
const allowMutations = flags.has('--mutations') || flags.has('--allow-mutations');
const external = flags.has('--external');
const processOutbox = flags.has('--process-outbox') || external;
const backupDryRun = flags.has('--backup-dry-run');
const skipFileUpload = flags.has('--skip-file-upload');
const verbose = flags.has('--verbose');

for (const arg of args) {
  if (
    ![
      '--mutations',
      '--allow-mutations',
      '--external',
      '--process-outbox',
      '--backup-dry-run',
      '--skip-file-upload',
      '--verbose',
    ].includes(arg)
  ) {
    failNow(`Argumento no reconocido: ${arg}`);
  }
}

const rawEnv = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const envFile = parseDotEnv(rawEnv);

for (const [key, value] of Object.entries(envFile)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

if (/^JWT_REFRESH_SECRET=.*JWT_ACCESS_EXPIRES_IN=/m.test(rawEnv)) {
  failNow(
    'Tu .env tiene JWT_REFRESH_SECRET y JWT_ACCESS_EXPIRES_IN pegados en la misma linea. Separalos antes de continuar.',
  );
}

const port = process.env.PORT || envFile.PORT || '3000';
const apiPrefix = process.env.API_PREFIX || envFile.API_PREFIX || 'api/v1';
const baseUrl = normalizeBaseUrl(process.env.BASE_URL || `http://localhost:${port}/${apiPrefix}`);

const password = process.env.SMOKE_PASSWORD || 'Demo123456!';
const emails = {
  patient: process.env.SMOKE_PATIENT_EMAIL || 'paciente.demo@corazonmigrante.test',
  therapist: process.env.SMOKE_THERAPIST_EMAIL || 'terapeuta.demo@corazonmigrante.test',
  admin: process.env.SMOKE_ADMIN_EMAIL || 'admin@corazonmigrante.test',
  superadmin: process.env.SMOKE_SUPERADMIN_EMAIL || 'superadmin@corazonmigrante.test',
  accountant: process.env.SMOKE_ACCOUNTANT_EMAIL || 'contador@corazonmigrante.test',
};
const testEmail = process.env.SMOKE_TEST_EMAIL || 'pabliarca@gmail.com';

const tmpDir = join(tmpdir(), `cm-smoke-deep-node-${process.pid}`);
mkdirSync(tmpDir, { recursive: true });
process.on('exit', () => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
});

let passed = 0;
let currentStep = '';
let lastResponse = null;

try {
  await main();
  line();
  console.log('SMOKE DEEP OK');
  console.log(`Pasos OK: ${passed}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Mutaciones: ${allowMutations}`);
  console.log(`Externos exigidos: ${external}`);
  line();
} catch (error) {
  console.error('');
  line();
  console.error(`[FAIL] Smoke interrumpido en: ${currentStep || 'paso desconocido'}`);
  if (lastResponse) {
    console.error(`Ultimo HTTP status: ${lastResponse.status}`);
    console.error('Ultimo body:');
    console.error(formatBody(lastResponse.body));
  }
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}

async function main() {
  step('Preflight: variables y entorno');
  info(`BASE_URL=${baseUrl}`);
  info(
    `ALLOW_MUTATIONS=${allowMutations} | EXTERNAL=${external} | PROCESS_OUTBOX=${processOutbox} | BACKUP_DRY_RUN=${backupDryRun}`,
  );
  info(`TEST_EMAIL=${testEmail}`);
  if (rawEnv.includes('GOOGLE_CREDENTIALS_BASE64=') || rawEnv.includes('DATABASE_PASSWORD=')) {
    info(
      'Aviso: este smoke no imprime secretos. Si compartiste claves reales, rotalas luego de probar.',
    );
  }
  ok('Preflight OK');

  step('Health: API + DB + Redis');
  const health = await api('GET', '/health', { expected: 200 });
  assert(health.data?.status === 'ok', 'Health status ok', health);
  assert(health.data?.database === 'ok', 'Database ok', health);
  if (Object.prototype.hasOwnProperty.call(health.data || {}, 'redis')) {
    assert(health.data.redis === 'ok', 'Redis ok', health);
  }

  step('Auth negativo: credenciales invalidas deben fallar');
  await api('POST', '/auth/login', {
    body: { email: emails.patient, password: 'ClaveIncorrecta123!' },
    expected: 401,
  });
  ok('Login incorrecto rechazado con 401');

  step('Auth positivo: login de todos los roles demo');
  const patientLogin = await login(emails.patient);
  const therapistLogin = await login(emails.therapist);
  const adminLogin = await login(emails.admin);
  const superadminLogin = await login(emails.superadmin);
  const accountantLogin = await login(emails.accountant);

  const tokens = {
    patient: required(patientLogin.data?.accessToken, 'accessToken paciente'),
    therapist: required(therapistLogin.data?.accessToken, 'accessToken terapeuta'),
    admin: required(adminLogin.data?.accessToken, 'accessToken admin'),
    superadmin: required(superadminLogin.data?.accessToken, 'accessToken superadmin'),
    accountant: required(accountantLogin.data?.accessToken, 'accessToken contador'),
  };
  const patientRefresh = required(patientLogin.data?.refreshToken, 'refreshToken paciente');
  ok('Tokens emitidos para paciente, terapeuta, admin, superadmin y contador');

  step('Auth: /me y estructura de roles');
  const mePatient = await api('GET', '/me', { token: tokens.patient, expected: 200 });
  assert(mePatient.data?.email === emails.patient, 'Paciente /me correcto', mePatient);
  assert(
    Array.isArray(mePatient.data?.roles) && mePatient.data.roles.includes('PATIENT'),
    'Paciente tiene rol PATIENT',
    mePatient,
  );
  const meTherapist = await api('GET', '/me', { token: tokens.therapist, expected: 200 });
  assert(
    Array.isArray(meTherapist.data?.roles) && meTherapist.data.roles.includes('THERAPIST'),
    'Terapeuta tiene rol THERAPIST',
    meTherapist,
  );
  const meAdmin = await api('GET', '/me', { token: tokens.admin, expected: 200 });
  assert(
    Array.isArray(meAdmin.data?.roles) && meAdmin.data.roles.includes('ADMIN'),
    'Admin tiene rol ADMIN',
    meAdmin,
  );

  step('Auth: refresh y logout con revocacion');
  const refreshResponse = await api('POST', '/auth/refresh', {
    body: { refreshToken: patientRefresh },
    expected: 201,
  });
  const newPatientToken = required(refreshResponse.data?.accessToken, 'nuevo accessToken paciente');
  const newPatientRefresh = required(
    refreshResponse.data?.refreshToken,
    'nuevo refreshToken paciente',
  );
  await api('POST', '/auth/logout', { body: { refreshToken: newPatientRefresh }, expected: 201 });
  await api('POST', '/auth/refresh', { body: { refreshToken: newPatientRefresh }, expected: 401 });
  ok('Refresh rota tokens y logout revoca refreshToken');

  step('RBAC negativo: permisos privados rechazados');
  await api('GET', '/admin/users?page=1&limit=5', { token: tokens.patient, expected: 403 });
  ok('Paciente no puede listar usuarios admin');
  await api('GET', '/admin/therapy/approaches?page=1&limit=5', {
    token: tokens.accountant,
    expected: 403,
  });
  ok('Contador no puede administrar catalogo terapeutico');
  await api('GET', '/admin/accounting/accounts?page=1&limit=5', {
    token: tokens.admin,
    expected: 403,
  });
  ok('Admin sin permiso contable no puede listar contabilidad');

  step('Publico: catalogo, CMS y queries clasicas page/limit');
  const approaches = await api('GET', '/therapy/approaches?page=1&limit=10', { expected: 200 });
  const products = await api('GET', '/therapy/products?page=1&limit=10', { expected: 200 });
  assert(
    Array.isArray(approaches.data) && approaches.data.length >= 1,
    'Catalogo publico de enfoques devuelve datos',
    approaches,
  );
  assert(
    Array.isArray(products.data) && products.data.length >= 1,
    'Catalogo publico de productos devuelve datos',
    products,
  );
  await api('GET', '/therapy/products?page=1&limit=999', { expected: 400 });
  ok('Validacion de limit maximo rechaza limit=999');
  const cms = await api('GET', '/public/pages/inicio', { expected: 200 });
  assert(cms.data?.slug === 'inicio', 'CMS publico inicio disponible', cms);

  step('Admin: usuarios, catalogo, analytics, audit, messaging');
  const users = await api('GET', '/admin/users?page=1&limit=50', {
    token: tokens.admin,
    expected: 200,
  });
  assert(Array.isArray(users.data) && users.data.length >= 5, 'Admin lista usuarios demo', users);
  const adminApproaches = await api('GET', '/admin/therapy/approaches?page=1&limit=10', {
    token: tokens.admin,
    expected: 200,
  });
  assert(
    Array.isArray(adminApproaches.data) && adminApproaches.data.length >= 1,
    'Admin lista enfoques',
    adminApproaches,
  );
  await api('POST', '/analytics/ui-events', {
    body: {
      sessionId: 'smoke-deep-node',
      eventName: 'SMOKE_DEEP_VISIT',
      payload: { source: 'node' },
    },
    expected: 201,
  });
  const analytics = await api('GET', '/admin/analytics/ui-events?page=1&limit=10', {
    token: tokens.admin,
    expected: 200,
  });
  assert(
    Array.isArray(analytics.data) && analytics.data.length >= 1,
    'Admin ve eventos analytics',
    analytics,
  );
  const audit = await api('GET', '/admin/audit/logs?page=1&limit=10', {
    token: tokens.admin,
    expected: 200,
  });
  assert(Array.isArray(audit.data), 'Admin consulta auditoria', audit);
  const outbox = await api('GET', '/admin/mensajeria/outbox?page=1&limit=10', {
    token: tokens.admin,
    expected: 200,
  });
  assert(Array.isArray(outbox.data), 'Admin consulta outbox', outbox);

  step('Booking: disponibilidad publica usando terapeuta y producto reales');
  const therapistId = required(
    users.data.find((u) => u.email === emails.therapist)?.id,
    'THERAPIST_ID',
  );
  const productId = required(products.data[0]?.id, 'PRODUCT_ID');
  const availabilityPath = `/booking/availability?therapistUserId=${encodeURIComponent(therapistId)}&productId=${encodeURIComponent(productId)}&from=2026-07-01&to=2026-07-07&timezone=America%2FLa_Paz`;
  const availability = await api('GET', availabilityPath, { expected: 200 });
  assert(
    Array.isArray(availability.data?.slots),
    'Disponibilidad devuelve arreglo de slots',
    availability,
  );
  const slotStart = availability.data.slots[0]?.startAt || '';
  if (slotStart) ok('Hay al menos un slot disponible para pruebas de cita');
  else info('No hay slot libre; se omite creacion de cita aunque --mutations este activo.');

  step('Terapeuta: agenda propia y validaciones');
  const schedules = await api('GET', '/therapists/me/schedules', {
    token: tokens.therapist,
    expected: 200,
  });
  assert(
    Array.isArray(schedules.data) && schedules.data.length >= 1,
    'Terapeuta lista agenda propia',
    schedules,
  );
  await api('POST', '/therapists/me/schedules', {
    token: tokens.therapist,
    body: {
      weekday: 1,
      startTime: '13:00',
      endTime: '09:00',
      timezone: 'America/La_Paz',
      effectiveFrom: '2026-07-01',
    },
    expected: 400,
  });
  ok('Agenda rechaza rango invalido');

  step('Contabilidad: lectura y regla de partida doble');
  const groups = await api('GET', '/admin/accounting/account-groups?page=1&limit=20', {
    token: tokens.accountant,
    expected: 200,
  });
  const accounts = await api('GET', '/admin/accounting/accounts?page=1&limit=20', {
    token: tokens.accountant,
    expected: 200,
  });
  assert(
    Array.isArray(groups.data) && groups.data.length >= 2,
    'Contador lista grupos de cuenta',
    groups,
  );
  assert(
    Array.isArray(accounts.data) && accounts.data.length >= 2,
    'Contador lista cuentas',
    accounts,
  );
  const debitAccountId = required(
    accounts.data.find((a) => a.normalBalance === 'DEBIT')?.id,
    'cuenta debito demo',
  );
  const creditAccountId = required(
    accounts.data.find((a) => a.normalBalance === 'CREDIT')?.id,
    'cuenta credito demo',
  );
  await api('POST', '/admin/accounting/transactions', {
    token: tokens.accountant,
    body: {
      date: '2026-07-01',
      description: 'Smoke desbalanceado',
      entries: [
        { accountId: debitAccountId, debit: 100, credit: 0 },
        { accountId: creditAccountId, debit: 0, credit: 99 },
      ],
    },
    expected: 400,
  });
  ok('Contabilidad rechaza transaccion desbalanceada');

  if (allowMutations) {
    const unique = `${Date.now()}-${process.pid}`;

    step('Mutaciones reales: registro paciente atomico');
    const newPatient = await api('POST', '/auth/register/patient', {
      body: {
        email: `smoke.patient.${unique}@corazonmigrante.test`,
        password: 'Demo123456!',
        firstName: 'Smoke',
        lastName: 'Paciente',
        phone: '+59170000000',
        country: 'Bolivia',
        city: 'Santa Cruz',
      },
      expected: 201,
    });
    assert(
      String(newPatient.data?.email || '').startsWith('smoke.patient.'),
      'Registro paciente crea usuario completo',
      newPatient,
    );

    step('Mutaciones reales: cita, historial, outbox y transiciones');
    if (slotStart) {
      const appointment = await api('POST', '/appointments', {
        token: newPatientToken,
        body: {
          therapistUserId: therapistId,
          productId,
          scheduledStartAt: slotStart,
          timezone: 'America/La_Paz',
          notesForTherapist: 'Smoke profundo Node',
        },
        expected: 201,
      });
      const appointmentId = required(appointment.data?.id, 'appointment id');
      assert(appointment.data?.status === 'REQUESTED', 'Cita creada en REQUESTED', appointment);
      await api('PATCH', `/appointments/${appointmentId}/status`, {
        token: tokens.therapist,
        body: { status: 'CONFIRMED', reason: 'Smoke confirma' },
        expected: 200,
      });
      await api('PATCH', `/appointments/${appointmentId}/status`, {
        token: tokens.therapist,
        body: { status: 'REQUESTED', reason: 'Smoke transicion invalida' },
        expected: 400,
      });
      ok('Cita confirma transicion valida y rechaza transicion invalida');
    } else {
      info('Sin slots disponibles; cita real omitida.');
    }

    step('Mutaciones reales: contabilidad balanceada');
    const tx = await api('POST', '/admin/accounting/transactions', {
      token: tokens.accountant,
      body: {
        date: '2026-07-01',
        description: 'Smoke balanceado',
        reference: 'SMOKE',
        entries: [
          { accountId: debitAccountId, debit: 100, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: 100 },
        ],
      },
      expected: 201,
    });
    assert(tx.data?.status === 'POSTED', 'Transaccion contable balanceada queda POSTED', tx);

    step('Mutaciones reales: CMS admin');
    const pageSlug = `smoke-${unique}`;
    const page = await api('POST', '/admin/cms/pages', {
      token: tokens.admin,
      body: {
        slug: pageSlug,
        title: 'Smoke Page',
        status: 'PUBLISHED',
        seoMetadata: { description: 'Smoke' },
      },
      expected: 201,
    });
    const pageId = required(page.data?.id, 'page id');
    await api('POST', `/admin/cms/pages/${pageId}/elements`, {
      token: tokens.admin,
      body: {
        code: 'hero',
        type: 'HERO',
        content: { title: 'Smoke', subtitle: 'OK' },
        sortOrder: 1,
      },
      expected: 201,
    });
    await api('GET', `/public/pages/${pageSlug}`, { expected: 200 });
    ok('CMS crea pagina y elemento visibles publicamente');

    if (!skipFileUpload) {
      await smokeFileUpload({ token: newPatientToken });
    }
  }

  if (external) {
    await smokeSendGrid({ adminToken: tokens.admin });
  } else if (processOutbox) {
    step('Mensajeria: procesar outbox en modo no externo');
    await api('POST', '/admin/mensajeria/outbox/process', { token: tokens.admin, expected: 201 });
    ok('Outbox procesado. En modo no externo puede usar DEV_NULL.');
  }

  if (backupDryRun) {
    step('Backup Neon: dry-run seguro');
    const result = spawnSync('yarn', ['db:backup:neon'], {
      env: { ...process.env, BACKUP_DRY_RUN: 'true', BACKUP_RESTORE_TO_NEON: 'false' },
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (verbose || result.status !== 0) {
      console.log(result.stdout);
      console.error(result.stderr);
    }
    if (result.status !== 0) throw new Error('Backup dry-run fallo.');
    ok('Backup dry-run valido comandos sin restaurar en Neon');
  }
}

async function smokeFileUpload({ token }) {
  step('Mutaciones reales: upload de imagen PNG 1x1 y verificacion de descarga');
  const storageProvider = String(process.env.STORAGE_PROVIDER || '').toUpperCase();
  if (external && storageProvider !== 'GCS') {
    throw new Error(
      `Para --external, STORAGE_PROVIDER debe ser GCS. Valor actual: ${storageProvider || 'vacio'}.`,
    );
  }

  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
  const buffer = Buffer.from(pngBase64, 'base64');
  if (!buffer.length) throw new Error('La imagen de prueba quedo vacia.');
  const originalSha = sha256(buffer);

  const form = new FormData();
  form.append('module', 'USER_PROFILE');
  form.append('visibility', 'PRIVATE');
  form.append('file', new Blob([buffer], { type: 'image/png' }), 'smoke-transparent-1x1.png');

  const upload = await api('POST', '/files', {
    token,
    form,
    expected: external ? 201 : '201,400,500',
  });

  if (upload.__status !== 201) {
    if (external) throw new Error(`Upload externo fallo con HTTP ${upload.__status}.`);
    info(
      `Upload no bloqueante fallo con HTTP ${upload.__status}. Usa --external para exigir GCS real.`,
    );
    return;
  }

  const fileId = required(upload.data?.id, 'file id');
  const signed = await api('GET', `/files/${fileId}/signed-url`, { token, expected: 200 });
  const provider = required(signed.data?.provider, 'signed url provider');
  const signedUrl = required(signed.data?.url, 'signed url');

  if (external && provider !== 'GCS') {
    throw new Error(`El archivo se subio, pero no a GCS. Provider devuelto: ${provider}.`);
  }

  const headers = provider === 'GCS' ? {} : { Authorization: `Bearer ${token}` };
  const response = await fetch(signedUrl, { headers });
  if (response.status !== 200) {
    throw new Error(
      `No se pudo descargar el archivo subido por signed URL. HTTP ${response.status}. Provider=${provider}`,
    );
  }
  const downloaded = Buffer.from(await response.arrayBuffer());
  if (!downloaded.length) throw new Error('La descarga por signed URL devolvio archivo vacio.');
  const downloadedSha = sha256(downloaded);
  if (downloadedSha !== originalSha) {
    throw new Error(`Checksum no coincide. Original=${originalSha} Descarga=${downloadedSha}`);
  }
  ok(
    `Imagen PNG subida, descargada y verificada por checksum. Provider=${provider} Size=${downloaded.length}B`,
  );
}

async function smokeSendGrid({ adminToken }) {
  step(`Externo: SendGrid real con correo de prueba a ${testEmail}`);
  const emailProvider = String(
    process.env.EMAIL_PROVIDER || process.env.MAIL_PROVIDER || '',
  ).toUpperCase();
  if (emailProvider !== 'SENDGRID') {
    throw new Error(
      `Para --external, EMAIL_PROVIDER o MAIL_PROVIDER debe ser SENDGRID. Valor actual: ${emailProvider || 'vacio'}.`,
    );
  }
  const sendgridApiKey = process.env.SENDGRID_API_KEY || '';
  if (!sendgridApiKey) throw new Error('Para --external, debes configurar SENDGRID_API_KEY.');
  if (!sendgridApiKey.startsWith('SG.')) {
    throw new Error(
      "SENDGRID_API_KEY no parece una API key real de SendGrid. Normalmente debe empezar con 'SG.'.",
    );
  }

  // Usamos /admin/mensajeria para validar la compatibilidad con la nomenclatura real
  // del backend legacy: schema mensajeria, tabla mensajeria.mensaje_outbox.
  const testOutbox = await api('POST', '/admin/mensajeria/test-email', {
    token: adminToken,
    body: {
      recipient: testEmail,
      subject: 'Corazon Migrante - smoke test externo',
      text: 'Correo real de prueba del smoke profundo de Corazon Migrante.',
    },
    expected: 201,
  });
  const testOutboxId = required(testOutbox.data?.id, 'test outbox id');

  // No procesamos todo el outbox porque eso mezcla mensajes viejos/fallidos.
  // Procesamos exclusivamente el id que este smoke acaba de crear.
  const processResult = await api(
    'POST',
    `/admin/mensajeria/outbox/${encodeURIComponent(String(testOutboxId))}/process`,
    {
      token: adminToken,
      expected: 201,
    },
  );

  const resultForThisMessage = Array.isArray(processResult.data?.results)
    ? processResult.data.results.find((item) => String(item.id) === String(testOutboxId))
    : undefined;
  if (!resultForThisMessage) {
    throw new Error(
      `El proceso de mensajeria no devolvio resultado para id=${testOutboxId}. Respuesta=${JSON.stringify(processResult, null, 2)}`,
    );
  }
  if (resultForThisMessage.status !== 'SENT') {
    const reason =
      resultForThisMessage.lastError || JSON.stringify(resultForThisMessage.responseMetadata || {});
    throw new Error(
      `SendGrid no envio el correo id=${testOutboxId}. Estado=${resultForThisMessage.status}. Error=${reason}`,
    );
  }

  const outboxAfter = await api('GET', '/admin/mensajeria/outbox?page=1&limit=50', {
    token: adminToken,
    expected: 200,
  });
  const found =
    Array.isArray(outboxAfter.data) &&
    outboxAfter.data.some(
      (item) =>
        String(item.id) === String(testOutboxId) &&
        item.recipient === testEmail &&
        item.status === 'SENT',
    );
  assert(found, `Correo de prueba enviado y marcado SENT para ${testEmail}`, outboxAfter);
}

async function login(email) {
  return api('POST', '/auth/login', { body: { email, password }, expected: 201 });
}

async function api(method, path, options = {}) {
  const { token = '', body = undefined, form = undefined, expected = 200 } = options;
  const url = `${baseUrl}${path}`;
  const headers = { Accept: 'application/json' };
  let requestBody;

  if (token) headers.Authorization = `Bearer ${token}`;
  if (form) {
    requestBody = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  if (verbose) {
    console.log(`\n> ${method} ${url}`);
    if (body !== undefined) console.log(JSON.stringify(body, null, 2));
  }

  let response;
  try {
    response = await fetch(url, { method, headers, body: requestBody });
  } catch (error) {
    throw new Error(
      `No se pudo conectar con ${method} ${url}. ¿El backend esta levantado? Error: ${error.message}`,
    );
  }

  const text = await response.text();
  const parsed = parseJsonMaybe(text);
  const result = typeof parsed === 'object' && parsed !== null ? parsed : { raw: text };
  Object.defineProperty(result, '__status', { value: response.status, enumerable: false });
  lastResponse = { status: response.status, body: result, method, path };

  if (!expectedIncludes(expected, response.status)) {
    throw new Error(
      `HTTP inesperado ${response.status} en ${method} ${path}. Esperado: ${expected}.`,
    );
  }

  if (verbose && text) console.log(formatBody(result));
  return result;
}

function parseDotEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function expectedIncludes(expected, status) {
  return String(expected)
    .split(',')
    .map((x) => Number(String(x).trim()))
    .includes(status);
}

function parseJsonMaybe(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function required(value, label) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`No se pudo obtener ${label}.`);
  }
  return value;
}

function assert(condition, message, details) {
  if (!condition) {
    console.error(formatBody(details));
    throw new Error(message);
  }
  ok(message);
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function line() {
  console.log('----------------------------------------------------------------');
}
function step(message) {
  currentStep = message;
  line();
  console.log(`[STEP] ${message}`);
}
function info(message) {
  console.log(`[INFO] ${message}`);
}
function ok(message) {
  passed += 1;
  console.log(`[OK] ${message}`);
}
function failNow(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}
function formatBody(body) {
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}
