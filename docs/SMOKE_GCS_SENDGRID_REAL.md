# Smoke profundo externo: GCS real + SendGrid real

Este smoke no se limita a verificar que la API responda. En modo externo valida integraciones reales:

1. **Google Cloud Storage real**
   - crea una imagen PNG 1x1 transparente;
   - la sube por `POST /api/v1/files`;
   - exige que el backend responda `provider = GCS`;
   - obtiene una signed URL;
   - descarga el archivo desde esa signed URL;
   - compara SHA-256 original vs descarga.

   Si el checksum coincide, se prueba que el archivo llegó al almacenamiento externo y que puede recuperarse correctamente.

2. **SendGrid real**
   - crea un outbox de prueba desde `POST /api/v1/admin/messaging/test-email`;
   - por defecto lo envía a `pablirca@gmail.com`;
   - procesa el outbox con `POST /api/v1/admin/messaging/outbox/process`;
   - verifica que el registro quede como `SENT`.

## Comando recomendado

```bash
yarn smoke:deep -- --mutations --external
```

Equivalente:

```bash
yarn smoke:deep:external
```

## Cambiar correo de prueba

Por defecto:

```bash
SMOKE_TEST_EMAIL=pablirca@gmail.com
```

Para enviar a otro correo:

```bash
SMOKE_TEST_EMAIL=otro@correo.com yarn smoke:deep -- --mutations --external
```

## Variables necesarias

Para GCS:

```env
STORAGE_PROVIDER=GCS
GCP_PROJECT_ID=tu-proyecto
GCS_BUCKET_NAME_USER_MEDIA=tu-bucket-privado
GCS_UPLOAD_PREFIX_USER_MEDIA=users
GOOGLE_CREDENTIALS_BASE64=...
```

Para SendGrid:

```env
MAIL_PROVIDER=SENDGRID
MAIL_FROM=no-reply@corazondemigrante.com
MAIL_FROM_NAME=Corazón Migrante
MAIL_REPLY_TO=corazonmigrante.global@gmail.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxx
```

> Nota: una API key real de SendGrid normalmente empieza con `SG.`. Si el smoke detecta otro formato, falla antes de intentar enviar.

## Resultado esperado

Al pasar correctamente verás pasos similares a:

```txt
[OK] Imagen PNG subida, descargada y verificada por checksum. Provider=GCS Size=68B
[OK] SendGrid reporta al menos un correo enviado
[OK] Correo de prueba enviado y marcado SENT para pablirca@gmail.com
SMOKE DEEP OK
```

## Seguridad

No subas `.env`, service accounts ni claves de Neon/GCS/SendGrid al repositorio. Si una clave fue compartida por chat o comprometida, rótala antes de producción.
