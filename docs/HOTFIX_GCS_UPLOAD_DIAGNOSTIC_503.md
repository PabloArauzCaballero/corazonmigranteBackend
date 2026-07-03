# Hotfix GCS upload diagnostic 503

Este hotfix evita que `POST /api/v1/files` devuelva `500 INTERNAL_SERVER_ERROR` genérico cuando Google Cloud Storage rechaza la operación.

## Cambios

- `src/modules/files/files.service.ts`
  - Captura errores de GCS en `upload` y `signed-url`.
  - Devuelve `503 GCS_UPLOAD_FAILED` o `503 GCS_SIGNED_URL_FAILED` con `providerMessage`, `providerCode`, bucket y objectKey.
  - Selecciona bucket por módulo:
    - `USER_PROFILE`, `APPOINTMENT`, etc. -> `GCS_BUCKET_NAME_USER_MEDIA`.
    - `CMS`, `THERAPY_CATALOG` -> `GCS_BUCKET_NAME_PUBLIC_ASSETS`.
  - Corrige storage local creando el directorio real de `objectKey`.

- `src/config/configuration.ts`
  - Expone `files.gcs.userMediaBucket` y `files.gcs.publicAssetsBucket`.

## Cómo probar

```powershell
yarn build
# reinicia backend
Ctrl + C
yarn start:dev
```

En otra terminal:

```powershell
yarn smoke:deep:external
```

Si GCS falla, ahora el body debe mostrar el motivo real: credencial inválida, bucket inexistente, permiso insuficiente o error al firmar URL.
