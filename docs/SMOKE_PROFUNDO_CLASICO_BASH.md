# Smoke profundo clásico Bash

Este proyecto incluye un smoke profundo compatible con entornos clásicos de backend: Linux, macOS, Git Bash, WSL, Docker/CI y GitHub Actions.

No usa PowerShell.

## Comandos

Backend levantado en otra terminal:

```bash
yarn start:dev
```

Smoke lectura + validaciones negativas:

```bash
yarn smoke:deep
```

Smoke profundo con escrituras reales:

```bash
yarn smoke:deep -- --mutations
```

Smoke con integraciones externas obligatorias, como GCS y procesamiento real si se activa:

```bash
yarn smoke:deep -- --mutations --external
```

Smoke procesando outbox/email:

```bash
yarn smoke:deep -- --mutations --process-outbox
```

Backup Neon en dry-run seguro:

```bash
yarn smoke:deep -- --backup-dry-run
```

## Qué valida

- Health API + base de datos + Redis.
- Login inválido debe devolver 401.
- Login de paciente, terapeuta, admin, superadmin y contador.
- `/me` y roles del JWT.
- Refresh token, rotación y logout.
- RBAC negativo: paciente no entra a admin, contador no gestiona catálogo, admin no entra a contabilidad si no tiene permiso.
- Catálogo público con `page` y `limit`.
- Validación de `limit` máximo.
- CMS público.
- Usuarios admin.
- Catálogo admin.
- Analytics.
- Auditoría.
- Outbox.
- Booking availability con terapeuta/producto reales.
- Agenda terapeuta y validación de horarios inválidos.
- Contabilidad: lectura, transacción desbalanceada rechazada y, con `--mutations`, transacción balanceada aceptada.
- Con `--mutations`: registro paciente, cita, transición válida/inválida, CMS admin, archivos y signed URL.

## Nota sobre `limit`

El backend ahora acepta `limit` como alias de `pageSize`, porque muchos frontends y smoke tests usan `?page=1&limit=10`. Antes se devolvía 400 por `forbidNonWhitelisted`.


## Validación externa real

Para validar Google Cloud Storage y SendGrid de verdad, usa:

```bash
yarn smoke:deep -- --mutations --external
```

Este modo sube una imagen PNG 1x1 transparente a GCS, la descarga por signed URL y compara checksum. También envía un correo de prueba a `pablirca@gmail.com` mediante SendGrid. Más detalle en `docs/SMOKE_GCS_SENDGRID_REAL.md`.
