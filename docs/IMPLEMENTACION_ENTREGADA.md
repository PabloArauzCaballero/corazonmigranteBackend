# Implementación entregada en este ZIP

Este proyecto implementa el último prompt docente 10/10 como backend NestJS real.

## Módulos implementados

| Módulo | Estado | Incluye |
|---|---|---|
| Auth | Implementado | Registro paciente/terapeuta, login, refresh, logout, reset password por PIN. |
| Users | Implementado | `/me`, edición de perfiles, listado admin. |
| RolesPermissions | Implementado | Roles, permisos, asignación y lectura para JWT. |
| TherapyCatalog | Implementado | Enfoques/productos públicos y administración. |
| Scheduling | Implementado | Horarios, bloqueos y disponibilidad con Luxon. |
| Appointments | Implementado | Crear cita, listar propias, actualizar estado, historial, auditoría y outbox. |
| Files | Implementado | Upload local o GCS, metadata, MIME allowlist, signed URL y ownership. |
| CMS | Implementado base | Páginas públicas y creación admin. |
| Accounting | Implementado base | Plan de cuentas, centros de costo y transacciones balanceadas. |
| Messaging | Implementado | Outbox transaccional, DEV_NULL y SendGrid. |
| Audit | Implementado | Logs consultables por admin. |
| Analytics | Implementado base | UI events y listado admin. |
| Health | Implementado | Verifica API + DB + Redis. |
| Redis | Implementado base | RedisService global para ping/cache JSON/invalidation por patrón. |
| LegacyCompatibility | Implementado base | Punto de control temporal para mapeos legacy. |

## Decisiones tomadas

- No se incluyen secretos reales ni JSON de Google Cloud en el ZIP.
- GCS se activa con `STORAGE_PROVIDER=GCS` y credenciales del runtime o `GOOGLE_APPLICATION_CREDENTIALS` local.
- SendGrid se activa con `EMAIL_PROVIDER=SENDGRID`.
- El refresh token se guarda hasheado con SHA-256; el password se guarda con bcrypt.
- Los roles/permisos viajan en JWT para que los guards globales autoricen sin consultar DB en cada request.
- Toda ruta nueva vive bajo `/api/v1`.
- Redis está disponible como infraestructura real y se valida en `/health`.

## Validación rápida

```bash
npm run build
npm run db:migrate
npm run db:seed
npm run smoke
```
