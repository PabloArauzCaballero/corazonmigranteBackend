# Smoke profundo en Windows / PowerShell

Este smoke no reemplaza los tests unitarios ni e2e de Jest. Su objetivo es validar que el backend levantado realmente funciona contra servicios reales o semi-reales: API, DB, Redis, auth, RBAC, catálogo, CMS, agenda, citas, contabilidad, archivos, GCS/local, auditoría, analytics y outbox.

## 1. Preflight obligatorio del `.env`

Antes de ejecutar el smoke, revisa estas reglas:

1. No subas `.env` al repositorio.
2. Si pegaste credenciales reales en una conversación o archivo compartido, rota esas claves.
3. `JWT_ACCESS_EXPIRES_IN=15m` debe estar en una línea separada. No debe quedar pegado al final de `JWT_REFRESH_SECRET`.
4. Esta versión soporta aliases del `.env` legacy:
   - `REDIS_URL` o `REDIS_HOST`/`REDIS_PORT`
   - `MAIL_PROVIDER`/`MAIL_FROM` o `EMAIL_PROVIDER`/`EMAIL_FROM_EMAIL`
   - `GCS_BUCKET` o `GCS_BUCKET_NAME_USER_MEDIA`
   - `GOOGLE_CREDENTIALS_BASE64`, `GOOGLE_CREDENTIALS_JSON` o `GOOGLE_APPLICATION_CREDENTIALS`

## 2. Levantar backend

Terminal 1:

```powershell
yarn build
yarn start:dev
```

El backend debe quedar en el puerto de tu `.env`, por ejemplo:

```txt
http://localhost:3003/api/v1
```

## 3. Smoke profundo seguro, solo lectura

Terminal 2:

```powershell
yarn smoke:deep:win
```

Valida:

- health API + DB + Redis;
- endpoints públicos;
- seguridad sin token;
- login inválido;
- login de todos los roles demo;
- `/me`;
- refresh/logout/revocación;
- RBAC negativo;
- RBAC positivo;
- analytics;
- audit;
- outbox listado.

## 4. Smoke profundo con mutaciones controladas

```powershell
yarn smoke:deep:win -- -AllowMutations
```

Valida adicionalmente:

- registro real de paciente temporal;
- protección contra email duplicado;
- actualización de perfil;
- creación/patch/delete lógico de catálogo;
- creación de CMS y lectura pública;
- disponibilidad de agenda;
- creación de cita;
- transición válida e inválida de cita;
- asiento contable balanceado;
- rechazo de asiento desbalanceado;
- upload de archivo local/GCS;
- signed URL.

## 5. Smoke con outbox real / SendGrid

```powershell
yarn smoke:deep:win -- -AllowMutations -ProcessOutbox
```

Úsalo solo si quieres procesar mensajes reales. Si `MAIL_PROVIDER=SENDGRID` o `EMAIL_PROVIDER=SENDGRID`, puede intentar enviar correos reales.

## 6. Base URL personalizada

```powershell
yarn smoke:deep:win -- -BaseUrl "http://localhost:3003/api/v1"
```

## 7. Si falla Redis

Asegúrate de tener Redis levantado:

```powershell
docker compose up -d redis
```

O define variables compatibles:

```env
REDIS_URL=redis://127.0.0.1:6379
```

## 8. Si falla GCS

Para `STORAGE_PROVIDER=GCS`, debes tener:

```env
GCS_BUCKET=nombre-del-bucket
# o
GCS_BUCKET_NAME_USER_MEDIA=nombre-del-bucket
```

Y una de estas opciones:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\ruta\service-account.json
GOOGLE_CREDENTIALS_JSON={...json...}
GOOGLE_CREDENTIALS_BASE64=base64-del-json
```

## 9. Si falla SendGrid

El API key real de SendGrid normalmente empieza con `SG.`. Si el valor no tiene ese formato, el smoke puede listar outbox, pero el procesamiento real probablemente fallará.

## 10. Orden recomendado completo

```powershell
corepack enable
corepack prepare yarn@4.9.2 --activate

yarn install
yarn build
yarn db:migrate
yarn db:seed

yarn start:dev
```

En otra terminal:

```powershell
yarn smoke:deep:win
yarn smoke:deep:win -- -AllowMutations
```
