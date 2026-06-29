# Smoke profundo clásico con Node.js

Este proyecto ya no depende de `/bin/bash` para ejecutar el smoke principal.

## Problema corregido

En Windows PowerShell el comando anterior fallaba con:

```txt
execvpe(/bin/bash) failed: No such file or directory
```

Eso pasaba porque `yarn smoke:deep` llamaba internamente a:

```bash
bash scripts/smoke-deep.sh
```

La versión corregida usa:

```bash
node scripts/smoke-deep.mjs
```

Por eso funciona igual en Windows, Linux y macOS.

## Comandos principales

Smoke profundo sin escrituras fuertes:

```bash
yarn smoke:deep
```

Smoke profundo con mutaciones reales:

```bash
yarn smoke:deep -- --mutations
```

o también:

```bash
yarn smoke:deep:mutations
```

Smoke profundo con mutaciones + integraciones externas reales:

```bash
yarn smoke:deep -- --mutations --external
```

o también:

```bash
yarn smoke:deep:external
```

## Qué valida

- Health API.
- Conexión con base de datos.
- Conexión Redis cuando el health la expone.
- Login inválido.
- Login de paciente, terapeuta, admin, superadmin y contador.
- `/me` y roles.
- Refresh token.
- Logout y revocación de refresh token.
- RBAC negativo.
- Catálogo público con `page` y `limit`.
- CMS público.
- Admin users, catalog, analytics, audit y outbox.
- Disponibilidad de booking.
- Agenda del terapeuta.
- Contabilidad y rechazo de transacción desbalanceada.
- Con `--mutations`: registro, cita, transacción balanceada, CMS y archivo.
- Con `--external`: GCS real y SendGrid real.

## Prueba real de GCS

Cuando se usa `--external`, el smoke:

1. Crea una imagen PNG 1x1 transparente en memoria.
2. La sube por `POST /api/v1/files`.
3. Exige que el provider sea `GCS`.
4. Pide signed URL.
5. Descarga la imagen.
6. Compara SHA-256 del archivo original contra el descargado.

Si el checksum coincide, la subida y descarga desde Google Cloud Storage son reales.

## Prueba real de SendGrid

Cuando se usa `--external`, el smoke:

1. Encola un correo con `POST /api/v1/admin/messaging/test-email`.
2. Procesa outbox con `POST /api/v1/admin/messaging/outbox/process`.
3. Exige que el outbox quede en `SENT`.

El destinatario por defecto es:

```txt
pablirca@gmail.com
```

Puedes cambiarlo así:

```bash
SMOKE_TEST_EMAIL=otro@correo.com yarn smoke:deep -- --mutations --external
```

## Scripts Bash conservados

Los scripts Bash no se eliminaron. Quedaron como alternativa explícita:

```bash
yarn smoke:deep:bash
yarn smoke:deep:bash:mutations
yarn smoke:deep:bash:external
```
