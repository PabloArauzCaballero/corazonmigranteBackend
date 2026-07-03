# Corazón Migrante Backend — Implementación Reingenierizada NestJS

Este ZIP contiene una implementación base completa del backend reingenierizado solicitado en el último prompt docente 10/10.

## Qué incluye

- NestJS + TypeScript strict.
- PostgreSQL + Sequelize + migrations + seeders.
- Redis configurado para cache/rate-limit/jobs futuros.
- Auth con JWT access token + refresh token rotativo hasheado.
- RBAC con roles y permisos.
- DTOs con `class-validator`.
- Swagger/OpenAPI en `/docs`.
- API versionada bajo `/api/v1`.
- Módulos: Auth, Users, RolesPermissions, TherapyCatalog, Scheduling, Appointments, Files, CMS, Accounting, Messaging, Audit, Analytics, Health y LegacyCompatibility.
- Docker Compose local con API + Postgres + Redis.
- Tests Jest/Supertest de base.
- Documentación docente dentro de `docs/` y README interno por módulo.

## Arranque rápido desde cero

> Requisito: Node.js 20+ y Docker instalado.

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:migrate
npm run db:seed
npm run start:dev
```

Luego abre:

```txt
http://localhost:3000/docs
http://localhost:3000/api/v1/health
```

## Credenciales demo del seeder

| Rol         | Email                                 | Password      |
| ----------- | ------------------------------------- | ------------- |
| Super admin | `superadmin@corazonmigrante.test`     | `Demo123456!` |
| Admin       | `admin@corazonmigrante.test`          | `Demo123456!` |
| Contador    | `contador@corazonmigrante.test`       | `Demo123456!` |
| Terapeuta   | `terapeuta.demo@corazonmigrante.test` | `Demo123456!` |
| Paciente    | `paciente.demo@corazonmigrante.test`  | `Demo123456!` |

## Flujo mínimo para probar

1. Login:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"paciente.demo@corazonmigrante.test","password":"Demo123456!"}'
```

2. Copia el `accessToken`.

3. Consultar usuario actual:

```bash
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer TU_TOKEN"
```

4. Ver catálogo público:

```bash
curl http://localhost:3000/api/v1/therapy/approaches
curl http://localhost:3000/api/v1/therapy/products
```

5. Ver disponibilidad:

```bash
curl "http://localhost:3000/api/v1/booking/availability?therapistUserId=UUID_TERAPEUTA&productId=UUID_PRODUCTO&from=2026-07-01&to=2026-07-07&timezone=America/La_Paz"
```

## Estructura principal

```txt
src/
  common/                 Utilidades comunes: guards, decorators, filters, interceptors, pagination.
  config/                 Validación de variables de entorno.
  database/               Modelos Sequelize + migrations + seeders.
  modules/                Módulos de negocio.
  workers/                Worker de outbox.
docs/                     Documentación docente y contrato de reingeniería.
test/                     Tests e2e.
```

## Nota honesta de alcance

Esta implementación deja el backend listo como base productiva de reingeniería: compila como proyecto NestJS, define contratos, migraciones, seeds, módulos y reglas principales. Las integraciones externas reales como pasarela de pago, SendGrid/GCS productivos y frontend legacy específico quedan encapsuladas para conectar sin reescribir dominio.

## Regla más importante

El frontend nunca debe enviar `actorUserId`, `p_id_sesion` o IDs internos para autorizar acciones. El backend toma la identidad desde el JWT validado.

## Integraciones externas incluidas

Esta versión ya trae integración real configurable con:

- **SendGrid** para envío de correos desde el outbox.
- **Google Cloud Storage** para almacenamiento de archivos y generación de signed URLs.

Para desarrollo local puedes dejar:

```env
EMAIL_PROVIDER=DEV_NULL
STORAGE_PROVIDER=LOCAL
```

Para producción usa:

```env
EMAIL_PROVIDER=SENDGRID
STORAGE_PROVIDER=GCS
```

Revisa `docs/INTEGRACIONES_SENDGRID_GCS.md` y `.env.production.example` para la configuración completa.

## Smoke test

```bash
npm run smoke
```

Valida health, login demo, /me, catálogo público y CMS público.

## Validación aplicada a esta versión

Se ejecutó sobre el código real:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npm run build
npm test -- --runInBand
npm audit --omit=dev --audit-level=high
```

Resultado: lint OK, build OK, tests OK y sin vulnerabilidades **high** en dependencias productivas.

Para validar completamente con servicios reales:

```bash
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run smoke
```

## Backup hacia Neon remoto

Esta versión incluye un job de backup lógico hacia una **segunda base remota de Neon**.

Comando manual:

```bash
npm run db:backup:neon
```

Variables principales:

```env
SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/corazon_migrante?sslmode=require
NEON_BACKUP_DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.neon.tech/corazon_migrante_backup?sslmode=require
BACKUP_CONFIRM_REMOTE_NEON=true
```

También se incluye un workflow programado en:

```txt
.github/workflows/neon-backup.yml
```

Documentación completa:

```txt
docs/BACKUP_NEON.md
```

## Protección contra transacciones fragmentadas

Las operaciones críticas que escriben en varias tablas usan transacciones SQL con rollback automático. Para archivos en GCS/storage local, el backend aplica limpieza compensatoria si falla la escritura de metadata. Ver `docs/TRANSACTION_ROLLBACK_POLICY.md`.

## Smoke profundo Windows

Para pruebas profundas en PowerShell:

```powershell
yarn smoke:deep:win
yarn smoke:deep:win -- -AllowMutations
```

Documentación completa: `docs/SMOKE_PROFUNDO_WINDOWS.md`.

## Integración interna Newspaper

Este backend ahora incluye los módulos internos `content`, `advertising` y `homepage`, derivados de la lógica útil de Newspaper, pero reimplementados dentro de la arquitectura de Corazón Migrante.

Documentos principales:

- `docs/MIGRATION_NEWSPAPER_TO_CORAZON.md`
- `docs/API_CONTENT_ADVERTISING_HOMEPAGE.md`
- `docs/TESTING_CONTENT_ADVERTISING_HOMEPAGE.md`

Validación rápida:

```bash
yarn typecheck
yarn lint
yarn build
yarn test
yarn db:migrate
yarn db:seed
yarn smoke:newspaper-internal
```
