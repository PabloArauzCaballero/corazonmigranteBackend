# Hotfix: upload GCS devolvía 500 genérico

## Problema

El smoke externo fallaba en:

```txt
Mutaciones reales: upload de imagen PNG 1x1 y verificacion de descarga
```

con HTTP 500 genérico. El backend sí entraba al endpoint, pero los errores reales de Google Cloud Storage quedaban ocultos por el filtro global.

## Corrección

1. El servicio de archivos ahora devuelve errores controlados:
   - `GCS_UPLOAD_FAILED`
   - `GCS_SIGNED_URL_FAILED`
2. Los detalles incluyen bucket, object key, código del proveedor y mensaje de GCS.
3. Se soportan buckets separados:
   - `GCS_BUCKET_NAME_USER_MEDIA`
   - `GCS_BUCKET_NAME_PUBLIC_ASSETS`
   - `GCS_BUCKET` como alias legacy.

## Permisos mínimos de la service account

La service account usada en `GOOGLE_CREDENTIALS_BASE64` o `GOOGLE_CREDENTIALS_JSON` debe poder:

- subir objetos: `storage.objects.create`
- leer objetos: `storage.objects.get`
- borrar objetos: `storage.objects.delete`
- opcionalmente listar bucket para diagnóstico: `storage.objects.list`

Rol recomendado para pruebas:

```txt
Storage Object Admin
```

En producción se puede reducir a un rol custom.

## Smoke recomendado

```powershell
yarn smoke:deep:external
```

Si vuelve a fallar, el body ya no debería ser 500 genérico, sino algo como:

```json
{
  "error": {
    "code": "GCS_UPLOAD_FAILED",
    "message": "No se pudo subir el archivo a Google Cloud Storage.",
    "details": [
      {
        "provider": "GCS",
        "bucket": "...",
        "providerCode": 403,
        "providerMessage": "..."
      }
    ]
  }
}
```
