# Hardening de credenciales por variables de entorno

Esta versión permite configurar credenciales sensibles sin dejar archivos JSON dentro del repositorio.

## Regla principal

Nunca versionar:

- `.env`
- `secrets/`
- JSON de Google Service Account
- llaves SendGrid
- URLs con contraseña de Neon/PostgreSQL
- JWT secrets

## Google Cloud Storage sin archivo en el repo

Opción recomendada cuando se quiere inyectar todo por entorno:

```env
STORAGE_PROVIDER=GCS
GCS_BUCKET=tu-bucket
GCP_PROJECT_ID=tu-project-id
GCS_CREDENTIALS_JSON_BASE64=PEGAR_BASE64_DEL_SERVICE_ACCOUNT_JSON
GOOGLE_APPLICATION_CREDENTIALS=
```

Generar el base64 desde PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\\ruta\\service-account.json")) | Set-Clipboard
```

Generar el base64 desde Bash/WSL:

```bash
base64 -w 0 /ruta/service-account.json
```

El backend crea el cliente de Google Cloud Storage con esas credenciales usando `new Storage({ credentials })`.

## Alternativa local segura

También puedes dejar el JSON fuera del repo y apuntar a él:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\\Users\\DELL\\.secrets\\corazon-migrante-gcs.json
```

No uses rutas como `./secrets/archivo.json` si esa carpeta puede terminar versionada.

## SendGrid

```env
EMAIL_PROVIDER=SENDGRID
EMAIL_FROM_EMAIL=no-reply@tudominio.com
EMAIL_FROM_NAME=Corazón Migrante
SENDGRID_API_KEY=SG.xxxxx
```

Si una llave SendGrid fue pegada en chat, commit, issue, screenshot o documento compartido, debe rotarse.

## Neon/PostgreSQL

Para Neon normalmente se usa SSL:

```env
DATABASE_SSL=true
```

Esta versión también acepta:

```env
DATABASE_SSL=require
```

## Error común JWT

No pegar dos variables en una sola línea:

```env
# MAL
JWT_REFRESH_SECRET=xxxJWT_ACCESS_EXPIRES_IN=15m

# BIEN
JWT_REFRESH_SECRET=xxx
JWT_ACCESS_EXPIRES_IN=15m
```
