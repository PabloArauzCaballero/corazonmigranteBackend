# Contratos API y DTOs

## Estándares globales

- Prefix: `/api/v1`.
- Auth: `Authorization: Bearer <accessToken>`.
- Content-Type JSON salvo upload multipart.
- Fechas en ISO 8601 UTC para instantes (`scheduledStartAt`) y timezone explícito para agenda.
- Paginación: `page=1&pageSize=20&sort=createdAt&order=desc`.
- Search: `search=` para búsquedas textuales.
- Errores con códigos estables.

## Auth

### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "paciente.demo@example.com",
  "password": "Demo123456!"
}
```

Validación:

- `email`: email válido, lower-case transformado.
- `password`: string requerido, min 8.

Response:

```json
{
  "data": {
    "accessToken": "jwt",
    "refreshToken": "opaque-token",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "paciente.demo@example.com",
      "roles": ["PATIENT"],
      "status": "ACTIVE"
    }
  }
}
```

Errores:

- `AUTH_INVALID_CREDENTIALS` 401.
- `AUTH_USER_DISABLED` 403.
- `AUTH_EMAIL_NOT_VERIFIED` 403 si aplica.
- `RATE_LIMITED` 429.

### `POST /api/v1/auth/register/patient`

```json
{
  "email": "nuevo@example.com",
  "password": "Demo123456!",
  "firstName": "Ana",
  "lastName": "Rojas",
  "phone": "+59170000000",
  "birthDate": "1998-01-20",
  "country": "Bolivia",
  "city": "Santa Cruz de la Sierra",
  "occupation": "Estudiante"
}
```

Response: usuario en `PENDING_EMAIL_VERIFICATION` o `ACTIVE` según regla de PIN.

### `POST /api/v1/auth/register/therapist`

Debe crear usuario terapeuta en estado `PENDING_APPROVAL`. No aparece públicamente hasta aprobación.

Campos mínimos:

```json
{
  "email": "terapeuta@example.com",
  "password": "Demo123456!",
  "firstName": "Lucía",
  "lastName": "Mendoza",
  "phone": "+59170000001",
  "title": "Psicóloga",
  "mainSpecialty": "Terapia familiar",
  "licenseNumber": "MAT-12345",
  "country": "Bolivia",
  "city": "Santa Cruz de la Sierra",
  "baseSessionPrice": 180
}
```

## Usuarios

### `GET /api/v1/me`

Devuelve identidad, roles, permisos resumidos y perfil según rol.

### `PATCH /api/v1/me/patient-profile`

Permite editar solo campos seguros del paciente. Prohibido editar `role`, `status`, `passwordHash`, `emailVerifiedAt`.

## Catálogo terapéutico

### `GET /api/v1/therapy/approaches`

Query:

```txt
status=ACTIVE&page=1&pageSize=20&search=ansiedad
```

Público devuelve solo activos. Admin puede filtrar todos desde ruta admin.

### `POST /api/v1/admin/therapy/products`

```json
{
  "approachId": "uuid",
  "name": "Sesión individual online",
  "description": "Acompañamiento terapéutico individual.",
  "durationMinutes": 60,
  "price": 180,
  "currency": "BOB",
  "status": "ACTIVE",
  "sortOrder": 1
}
```

Validación:

- `durationMinutes`: 15 a 240.
- `price`: número >= 0.
- `currency`: ISO o catálogo permitido.
- `approachId`: existente y activo para público.

## Agenda

### `POST /api/v1/therapists/me/schedules`

```json
{
  "weekday": 1,
  "startTime": "09:00",
  "endTime": "13:00",
  "timezone": "America/La_Paz",
  "effectiveFrom": "2026-07-01",
  "effectiveTo": null
}
```

Reglas:

- `weekday`: 0 domingo a 6 sábado.
- No permitir solapamientos activos.
- Generar nueva versión si se actualiza horario versionado.

### `GET /api/v1/booking/availability`

Query:

```txt
therapistUserId=uuid&productId=uuid&from=2026-07-01&to=2026-07-14&timezone=America/La_Paz
```

Reglas:

- Rango máximo 31 días.
- Excluir horarios bloqueados.
- Excluir citas activas confirmadas/solicitadas.

## Citas

### `POST /api/v1/appointments`

```json
{
  "therapistUserId": "uuid",
  "productId": "uuid",
  "scheduledStartAt": "2026-07-05T15:00:00.000Z",
  "timezone": "America/La_Paz",
  "notesForTherapist": "Prefiero modalidad online."
}
```

Reglas:

- Paciente autenticado se toma del JWT.
- Verificar disponibilidad dentro de transacción.
- No permitir doble reserva.
- Estado inicial: `REQUESTED` o `CONFIRMED` según configuración.
- Enqueue notificación al paciente, terapeuta y/o admin.

### `PATCH /api/v1/appointments/:id/status`

```json
{
  "status": "CANCELLED_BY_PATIENT",
  "reason": "No podré asistir."
}
```

Reglas:

- Validar transición permitida.
- Registrar `appointment_status_history`.
- Auditar acción.
- Notificar por outbox.

## Archivos

### `POST /api/v1/files`

Multipart:

- `file`: binario.
- `module`: `USER_PROFILE`, `THERAPY_CATALOG`, `CMS`, `APPOINTMENT`.
- `entityType`: opcional.
- `entityId`: opcional.
- `visibility`: `PRIVATE` o `PUBLIC`.

Reglas:

- Tamaño máximo por módulo.
- MIME allowlist.
- `objectKey` generado por backend.
- No aceptar path arbitrario del frontend.

## Contabilidad

### `POST /api/v1/admin/accounting/transactions`

```json
{
  "date": "2026-07-01",
  "description": "Venta sesión terapéutica",
  "reference": "APT-0001",
  "entries": [
    { "accountId": "uuid", "costCenterId": "uuid", "debit": 180, "credit": 0 },
    { "accountId": "uuid", "costCenterId": "uuid", "debit": 0, "credit": 180 }
  ]
}
```

Reglas:

- Suma débitos = suma créditos.
- Solo `ACCOUNTANT` o permiso `accounting:write`.
- Auditar creación.

## CMS

### `GET /api/v1/public/pages/:slug`

Devuelve página publicada con elementos y assets públicos.

### `POST /api/v1/admin/cms/pages`

Admin CMS con `cms:write`.
