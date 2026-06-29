# Integraciones reales: SendGrid y Google Cloud Storage

Este backend soporta dos modos de operación para servicios externos:

- `DEV_NULL` / `LOCAL`: útil para desarrollo local, porque no llama proveedores reales.
- `SENDGRID` / `GCS`: útil para producción, porque envía correos reales y guarda archivos en Google Cloud Storage.

## 1. SendGrid

### Variables requeridas

```env
EMAIL_PROVIDER=SENDGRID
EMAIL_FROM_EMAIL=no-reply@corazonmigrante.com
EMAIL_FROM_NAME=Corazón Migrante
SENDGRID_API_KEY=SG.xxxxx
```

### Cómo funciona en el código

Los módulos de negocio no llaman SendGrid directamente. Solo encolan mensajes en `message_outbox` usando `MessagingService.enqueue(...)`.

Luego el worker ejecuta:

```bash
npm run worker:outbox
```

El worker lee mensajes `PENDING`, llama SendGrid y escribe el resultado en `message_send_logs`.

Esta arquitectura evita acoplar Auth, Citas o Usuarios con el proveedor de email.

### Payload recomendado

```json
{
  "subject": "Confirma tu cita",
  "text": "Tu cita fue registrada correctamente.",
  "html": "<p>Tu cita fue registrada correctamente.</p>"
}
```

## 2. Google Cloud Storage

### Variables requeridas

```env
STORAGE_PROVIDER=GCS
GCS_BUCKET=corazon-migrante-prod-uploads
GCP_PROJECT_ID=tu-proyecto-gcp
FILE_SIGNED_URL_EXPIRES_SECONDS=900
```

### Autenticación recomendada

En producción sobre Cloud Run, GKE o Compute Engine, usa una Service Account asignada al runtime. No subas archivos `.json` al repositorio.

En local puedes usar:

```env
GOOGLE_APPLICATION_CREDENTIALS=/ruta/segura/service-account.json
```

Ese archivo debe estar fuera del repositorio y en `.gitignore`.

### Cómo funciona en el código

Cuando `STORAGE_PROVIDER=GCS`, `FilesService` sube el archivo al bucket configurado y guarda metadata en la tabla `files`:

- `storage_provider = GCS`
- `bucket = GCS_BUCKET`
- `object_key = ruta interna del objeto`
- `checksum = sha256 del archivo`

Para descarga, el backend genera una signed URL temporal de Google Cloud Storage. El usuario nunca recibe una credencial de Google.

## 3. Smoke test de GCS

Con backend levantado y token válido:

```bash
curl -X POST http://localhost:3000/api/v1/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "module=USER_PROFILE" \
  -F "visibility=PRIVATE" \
  -F "file=@./README.md"
```

Luego toma el `id` devuelto:

```bash
curl http://localhost:3000/api/v1/files/FILE_ID/signed-url \
  -H "Authorization: Bearer $TOKEN"
```

Debe devolver una URL firmada si `STORAGE_PROVIDER=GCS`.

## 4. Smoke test de SendGrid

Crea o deja pendiente un mensaje en `message_outbox` con:

```json
{
  "channel": "EMAIL",
  "recipient": "correo@dominio.com",
  "template_code": "TEST_EMAIL",
  "payload": {
    "subject": "Prueba Corazón Migrante",
    "text": "Este es un correo de prueba.",
    "html": "<p>Este es un correo de prueba.</p>"
  },
  "status": "PENDING"
}
```

Ejecuta:

```bash
npm run build
npm run worker:outbox
```

Debe quedar registro `SENT` en `message_outbox` y `message_send_logs` con provider `SENDGRID`.

## 5. Errores comunes

- `SENDGRID_API_KEY_REQUIRED`: falta `SENDGRID_API_KEY`.
- `EMAIL_FROM_EMAIL_REQUIRED`: falta remitente verificado.
- Error 401 de SendGrid: API key inválida.
- Error 403 de SendGrid: sender no verificado.
- `GCS_BUCKET_REQUIRED`: falta `GCS_BUCKET`.
- Error 403 de GCS: la Service Account no tiene permiso `storage.objects.create` o `storage.objects.get`.
- Signed URL falla: la credencial usada no puede firmar URLs. En Cloud Run conviene usar una service account con permisos adecuados.
