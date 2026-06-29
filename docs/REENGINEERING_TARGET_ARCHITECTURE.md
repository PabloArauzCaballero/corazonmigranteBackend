# Arquitectura objetivo 10/10

## Estilo arquitectónico

Backend modular monolítico con NestJS. Se elige monolito modular porque el proyecto necesita orden, velocidad de desarrollo y frontera clara entre dominios antes de pensar en microservicios.

La arquitectura debe permitir que en el futuro se separen workers, mensajería, archivos o analytics sin reescribir el dominio.

## Capas

```txt
HTTP / Controllers
  ↓
Guards / Pipes / Interceptors / Filters
  ↓
Application Services / Use Cases
  ↓
Domain Policies / Validators
  ↓
Repositories / Sequelize Models
  ↓
PostgreSQL / Redis / Storage / Email Provider
```

## Estructura recomendada

```txt
src/
  main.ts
  app.module.ts
  config/
    env.schema.ts
    database.config.ts
    redis.config.ts
    storage.config.ts
  common/
    decorators/
    guards/
    filters/
    interceptors/
    pipes/
    pagination/
    responses/
    errors/
  modules/
    auth/
    users/
    roles-permissions/
    therapy-catalog/
    scheduling/
    appointments/
    files/
    cms/
    accounting/
    messaging/
    audit/
    analytics/
    health/
    legacy-compatibility/
  database/
    migrations/
    seeders/
    models/
  workers/
    outbox.worker.ts
```

## Patrón por módulo

```txt
module-name/
  module-name.module.ts
  module-name.controller.ts
  module-name.service.ts
  dto/
  entities-or-models/
  policies/
  tests/
```

## Dependencias permitidas

| Módulo | Puede depender de | No debe depender de |
|---|---|---|
| Auth | Users, RolesPermissions, Audit, Messaging | Therapy, Accounting, CMS |
| Users | RolesPermissions, Files, Audit | Appointments como dependencia directa fuerte |
| TherapyCatalog | Files, Audit | Accounting salvo eventos |
| Scheduling | Users, Audit | Accounting |
| Appointments | Users, Scheduling, TherapyCatalog, Messaging, Audit | CMS |
| Accounting | Appointments, TherapyCatalog, Audit | CMS |
| Files | Users, Audit | TherapyCatalog como dependencia directa obligatoria |
| CMS | Files, Audit | Accounting |
| Messaging | Users, Audit | CMS, Accounting |
| Analytics | Audit opcional | módulos transaccionales |

## Convenciones de nombres

- Código en inglés: `AppointmentsService`, `TherapistSchedule`.
- Dominio visible al cliente puede mantenerse en español en textos/documentación.
- Rutas en inglés para consistencia técnica: `/therapy/approaches`, `/appointments`.
- No usar `apagar`, `modificar`, `listar` en rutas nuevas.

## Respuesta estándar

### Éxito simple

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-06-27T00:00:00.000Z"
  }
}
```

### Lista paginada

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 120,
    "totalPages": 6
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

### Error

```json
{
  "error": {
    "code": "APPOINTMENT_SLOT_NOT_AVAILABLE",
    "message": "El horario seleccionado ya no está disponible.",
    "details": []
  },
  "meta": {
    "requestId": "uuid"
  }
}
```
