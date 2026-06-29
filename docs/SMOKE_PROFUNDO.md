# Smoke profundo de integración

Este proyecto ya no usa un smoke básico de 5 endpoints como prueba principal. El comando principal ahora ejecuta un **smoke profundo**, pensado para encontrar errores reales antes de entregar o desplegar.

## Comando principal

```bash
yarn smoke
```

Alias equivalentes:

```bash
yarn smoke:deep
yarn smoke:win
```

En Windows funciona desde PowerShell porque está implementado en Node.js. No necesita Bash, WSL ni `jq`.

## Qué valida

1. Health de API, PostgreSQL y Redis.
2. Swagger `/docs`.
3. Login de superadmin, admin, contador, terapeuta y paciente.
4. `/me` con roles/permisos reales del JWT.
5. Seguridad negativa: sin token, token inválido y RBAC.
6. Validación DTO: payloads inválidos devuelven 400.
7. Catálogo público y catálogo admin.
8. Agenda privada del terapeuta y disponibilidad pública.
9. Creación de cita, doble reserva bloqueada, listado por paciente/terapeuta y transición de estado.
10. Registro atómico de paciente: user + profile + role + outbox.
11. Refresh token, logout y revocación.
12. Contabilidad: transacción desbalanceada rechazada y rollback validado.
13. CMS público/admin.
14. Analytics público/admin.
15. Archivos: upload, signed URL, ownership, admin access y rechazo MIME.
16. Messaging/outbox.
17. Auditoría admin.
18. Legacy compatibility.
19. Invariantes directas en PostgreSQL para detectar datos fragmentados.

## Orden recomendado completo

```bash
corepack enable
corepack prepare yarn@4.9.2 --activate

yarn install

docker compose up -d postgres redis

yarn db:reset

yarn build
yarn test --runInBand
yarn smoke
```

En otra terminal, antes del smoke, el backend debe estar levantado:

```bash
yarn start:dev
```

## Variables útiles

Cambiar URL:

```bash
BASE_URL=http://localhost:3000/api/v1 yarn smoke
```

Desactivar verificaciones directas contra PostgreSQL:

```bash
DEEP_SMOKE_DB=false yarn smoke
```

Ejecutar sin crear datos nuevos:

```bash
DEEP_SMOKE_MUTATE=false yarn smoke
```

Permitir Redis degradado temporalmente:

```bash
DEEP_SMOKE_REQUIRE_REDIS_OK=false yarn smoke
```

## Nota importante

El smoke profundo crea datos de prueba con prefijo `Smoke` y sufijo único. En ambientes de desarrollo es normal. Para volver a estado limpio:

```bash
yarn db:reset
```
