# Manejo seguro de credenciales por `.env`

## Regla principal

Las credenciales **nunca** deben vivir dentro del repositorio:

- no `secrets/*.json`;
- no `.env` real;
- no private keys;
- no API keys de SendGrid;
- no contraseñas de Neon;
- no OAuth client secrets.

El repositorio solo debe incluir plantillas como `.env.example` y `.env.production.example` sin valores reales.

## Variables soportadas por el backend

### Base de datos

El backend acepta dos estilos.

Estilo recomendado del backend:

```env
DATABASE_HOST=...
DATABASE_PORT=5432
DATABASE_USER=...
DATABASE_PASSWORD=...
DATABASE_NAME=...
DATABASE_SSL=true
```

Estilo compatible con Neon/libpq:

```env
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=...
SSLMODE=require
DB_SSL=true
```

### SendGrid

```env
EMAIL_PROVIDER=SENDGRID
EMAIL_FROM_EMAIL=no-reply@corazondemigrante.com
EMAIL_FROM_NAME=Corazón Migrante
EMAIL_REPLY_TO=corazonmigrante.global@gmail.com
SENDGRID_API_KEY=SG.xxxxx
```

También se aceptan aliases legacy:

```env
MAIL_PROVIDER=sendgrid
MAIL_FROM=no-reply@corazondemigrante.com
MAIL_FROM_NAME=Corazón Migrante
MAIL_REPLY_TO=corazonmigrante.global@gmail.com
```

### Google Cloud Storage sin archivo JSON en el repo

Opción A, JSON directo en variable de entorno:

```env
STORAGE_PROVIDER=GCS
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
```

Opción B, base64 del JSON, más cómodo para servidores y CI:

```bash
base64 -w 0 service-account.json
```

Luego:

```env
GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50Iiwi...
```

Opción C, `GOOGLE_APPLICATION_CREDENTIALS`, solo si el archivo existe fuera del repo y el runtime lo monta como secreto:

```env
GOOGLE_APPLICATION_CREDENTIALS=/var/run/secrets/google/service-account.json
```

No usar rutas como `./secrets/*.json` dentro del proyecto versionado.

## Buckets soportados

```env
GCS_BUCKET_NAME_USER_MEDIA=bucket-privado
GCS_UPLOAD_PREFIX_USER_MEDIA=users
GCS_BUCKET_NAME_PUBLIC_ASSETS=bucket-publico
GCS_UPLOAD_PREFIX_PUBLIC_ASSETS=admin_portal
GCS_SIGNED_URL_TTL_SECONDS=7200
```

El backend guarda archivos privados en el bucket privado y archivos con `visibility=PUBLIC` en el bucket público si está configurado.

## Qué hacer si una clave se expuso

Si una clave real fue pegada en un chat, commit, ZIP o repositorio, trátala como comprometida:

1. Revoca/rota la clave en el proveedor correspondiente.
2. Genera una nueva clave.
3. Configúrala solo en variables de entorno del servidor.
4. Elimina el archivo/valor del historial del repo si fue committeado.
5. Ejecuta una revisión para confirmar que no queden secretos en el código.

## Validación local

```bash
yarn build
yarn test --runInBand
yarn smoke
```
