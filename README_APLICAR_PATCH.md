# Patch Coolify + GCS Base64

Este patch corrige:

1. Dockerfile para Yarn, porque el Dockerfile anterior usaba `npm ci` pero el repo ya no debe tener `package-lock.json`.
2. `.dockerignore` para que no subas `.env`, `secrets/`, `node_modules` ni artefactos de build.
3. `.gitignore` para bloquear secretos y archivos locales.
4. `nixpacks.toml` para que Coolify/Nixpacks use Node 22 + Yarn 1.22.22 de forma consistente.
5. `src/config/configuration.ts` para priorizar `GOOGLE_CREDENTIALS_BASE64` y no romper si queda una variable vieja `GOOGLE_CREDENTIALS_JSON`.
6. `src/config/env.validation.ts` para aceptar variables legacy, pero recomendar Base64.

## Aplicación local

Descomprime este ZIP encima de tu backend.

Luego ejecuta:

```powershell
git rm --cached .env secrets/*.json .pnp.cjs .pnp.loader.mjs .yarn/install-state.gz 2>$null
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
corepack prepare yarn@1.22.22 --activate
yarn install
git status
```

Debe quedar al menos:

```txt
modified: yarn.lock
modified: Dockerfile
modified: .gitignore
new file: .dockerignore
new file: nixpacks.toml
modified: src/config/configuration.ts
modified: src/config/env.validation.ts
```

Haz commit:

```powershell
git add Dockerfile .dockerignore .gitignore nixpacks.toml src/config/configuration.ts src/config/env.validation.ts yarn.lock package.json
git commit -m "fix: stabilize coolify deploy and gcs base64 credentials"
git push
```

No subas `.env` ni `secrets/*.json`.

## Coolify

En Environment Variables deja `NODE_ENV=production` como runtime only; desmarca Available at Buildtime.

Para GCS usa solo:

```env
STORAGE_PROVIDER=GCS
GCP_PROJECT_ID=skilled-acolyte-484516-c7
GCS_BUCKET=TU_BUCKET_REAL
GCS_BUCKET_NAME_USER_MEDIA=TU_BUCKET_REAL
GCS_UPLOAD_PREFIX_USER_MEDIA=users
GCS_SIGNED_URL_TTL_SECONDS=7200
GOOGLE_CREDENTIALS_BASE64=BASE64_DEL_JSON_REAL
```

Vacía o elimina:

```env
GOOGLE_CREDENTIALS_JSON=
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_APPLICATION_CREDENTIALS_BASE64=
GOOGLE_SERVICE_ACCOUNT_BASE64=
GCP_SERVICE_ACCOUNT_BASE64=
GOOGLE_CREDENTIALS=
```

Después haz Redeploy.
