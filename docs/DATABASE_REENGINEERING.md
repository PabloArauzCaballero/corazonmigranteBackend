# Modelo de datos objetivo y migraciones

## Convenciones

- `id`: UUID primario recomendado para nuevas tablas. Si se requiere compatibilidad con IDs integer legacy, usar `legacyId` único nullable durante migración.
- `createdAt`, `updatedAt`, `deletedAt` en tablas de negocio.
- `createdByUserId`, `updatedByUserId` en tablas administrativas.
- Estados con ENUM/constraint o tabla catálogo cuando cambian por negocio.
- FKs indexadas siempre.
- Campos sensibles cifrados o minimizados cuando corresponda.

## Tablas principales objetivo

### Auth y usuarios

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `users` | `id`, `email`, `passwordHash`, `status`, `emailVerifiedAt`, `lastLoginAt`, `createdAt`, `updatedAt`, `deletedAt` | `email` único case-insensitive. No guardar password plano. |
| `roles` | `id`, `code`, `name`, `description` | Códigos: `PATIENT`, `THERAPIST`, `ADMIN`, `ACCOUNTANT`, `SUPER_ADMIN`. |
| `permissions` | `id`, `code`, `description` | Permisos granulares por módulo. |
| `user_roles` | `userId`, `roleId` | Unique compuesto. |
| `role_permissions` | `roleId`, `permissionId` | Seed base obligatorio. |
| `refresh_tokens` | `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `replacedByTokenId`, `userAgent`, `ipAddress` | Rotación y revocación. |
| `auth_pins` | `id`, `email`, `pinHash`, `purpose`, `expiresAt`, `consumedAt`, `attempts`, `metadata` | Rate limit y expiración. |
| `password_reset_requests` | `id`, `userId`, `tokenHash`, `expiresAt`, `usedAt` | Opcional si no se usa PIN. |

### Perfiles

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `patient_profiles` | `userId`, `firstName`, `lastName`, `phone`, `birthDate`, `country`, `city`, `occupation`, `profileMetadata`, `avatarFileId` | Un perfil por usuario paciente. |
| `therapist_profiles` | `userId`, `firstName`, `lastName`, `phone`, `title`, `mainSpecialty`, `bio`, `personalPhrase`, `youtubeUrl`, `licenseNumber`, `country`, `city`, `baseSessionPrice`, `approvalStatus`, `avatarFileId` | Terapeuta requiere aprobación para mostrarse públicamente. |
| `admin_profiles` | `userId`, `firstName`, `lastName`, `phone`, `level`, `linkedTherapistUserId` | Admin puede estar asociado a terapeuta. |

### Catálogo terapéutico

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `therapy_approaches` | `id`, `name`, `slug`, `description`, `status`, `imageFileId`, `sortOrder` | `slug` único. Público solo `ACTIVE`. |
| `therapy_products` | `id`, `approachId`, `name`, `slug`, `description`, `durationMinutes`, `price`, `currency`, `status`, `imageFileId`, `sortOrder` | Precio >= 0; duración > 0. |
| `therapist_approaches` | `therapistUserId`, `approachId` | Relación N:M. |
| `therapist_products` | `therapistUserId`, `productId`, `customPrice`, `isActive` | Permite precio por terapeuta. |

### Agenda y citas

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `therapist_schedules` | `id`, `therapistUserId`, `weekday`, `startTime`, `endTime`, `timezone`, `effectiveFrom`, `effectiveTo`, `version`, `status` | No solapar horarios activos del mismo terapeuta. |
| `therapist_blocked_times` | `id`, `therapistUserId`, `startAt`, `endAt`, `reason`, `status` | Bloqueos no pueden tener `endAt <= startAt`. |
| `appointments` | `id`, `patientUserId`, `therapistUserId`, `productId`, `scheduledStartAt`, `scheduledEndAt`, `timezone`, `status`, `price`, `currency`, `notesForTherapist`, `adminNotes` | Unique parcial para evitar doble reserva activa del mismo terapeuta/hora. |
| `appointment_status_history` | `id`, `appointmentId`, `fromStatus`, `toStatus`, `changedByUserId`, `reason`, `createdAt` | Toda transición se registra. |
| `appointment_details` | `appointmentId`, `meetingUrl`, `location`, `privateMetadata` | Separar detalle sensible. |

Estados permitidos de cita:

```txt
REQUESTED -> CONFIRMED -> COMPLETED
REQUESTED -> CANCELLED_BY_PATIENT
REQUESTED -> CANCELLED_BY_ADMIN
CONFIRMED -> CANCELLED_BY_PATIENT
CONFIRMED -> CANCELLED_BY_THERAPIST
CONFIRMED -> NO_SHOW
```

### Archivos

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `files` | `id`, `ownerUserId`, `module`, `entityType`, `entityId`, `storageProvider`, `bucket`, `objectKey`, `originalName`, `mimeType`, `sizeBytes`, `checksum`, `visibility`, `status`, `metadata` | `objectKey` generado por backend. |
| `file_access_logs` | `id`, `fileId`, `actorUserId`, `action`, `ipAddress`, `createdAt` | Auditar lecturas sensibles. |

### CMS público

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `cms_pages` | `id`, `slug`, `title`, `status`, `seoMetadata`, `publishedAt` | Slug único. |
| `cms_elements` | `id`, `pageId`, `code`, `type`, `content`, `fileId`, `sortOrder`, `status` | Elementos versionables si el CMS crece. |

### Contabilidad y pagos

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `account_groups` | `id`, `code`, `name`, `type`, `status` | Unique `code`. |
| `accounts` | `id`, `groupId`, `code`, `name`, `normalBalance`, `status` | Unique `code`. |
| `cost_centers` | `id`, `code`, `name`, `status` | Unique `code`. |
| `accounting_transactions` | `id`, `date`, `description`, `reference`, `status`, `createdByUserId` | Transacción balanceada. |
| `accounting_entries` | `id`, `transactionId`, `accountId`, `costCenterId`, `debit`, `credit` | `debit` o `credit`, no ambos; suma debe balancear. |
| `sales` | `id`, `appointmentId`, `productId`, `patientUserId`, `amount`, `currency`, `status` | Venta asociada a cita/producto. |
| `payments` | `id`, `saleId`, `provider`, `amount`, `currency`, `status`, `providerReference`, `paidAt` | Preparado para pasarela. |

### Mensajería, auditoría y analytics

| Tabla | Campos mínimos | Reglas |
|---|---|---|
| `message_outbox` | `id`, `channel`, `recipient`, `templateCode`, `payload`, `status`, `scheduledAt`, `lockedAt`, `attempts`, `lastError` | Worker procesa. |
| `message_send_logs` | `id`, `outboxId`, `provider`, `providerMessageId`, `status`, `responseMetadata` | Trazabilidad. |
| `audit_logs` | `id`, `actorUserId`, `action`, `entityType`, `entityId`, `before`, `after`, `ipAddress`, `userAgent`, `createdAt` | No editable/no borrable por app. |
| `public_visits` | `id`, `path`, `ipHash`, `userAgentHash`, `referrer`, `createdAt` | Minimizar datos personales. |
| `ui_events` | `id`, `sessionId`, `eventName`, `payload`, `createdAt` | Para analytics. |

## Índices mínimos

- `users(email)` unique lower-case.
- `users(status)`.
- `patient_profiles(userId)` unique.
- `therapist_profiles(userId)` unique.
- `therapist_profiles(approvalStatus)`.
- `therapy_approaches(slug)` unique.
- `therapy_products(slug)` unique.
- `therapy_products(approachId, status)`.
- `therapist_schedules(therapistUserId, weekday, status)`.
- `therapist_blocked_times(therapistUserId, startAt, endAt)`.
- `appointments(patientUserId, scheduledStartAt)`.
- `appointments(therapistUserId, scheduledStartAt)`.
- `appointments(status, scheduledStartAt)`.
- `files(ownerUserId, module, entityType, entityId)`.
- `message_outbox(status, scheduledAt)`.
- `audit_logs(actorUserId, createdAt)`.

## Migración desde DB legacy

1. Inventariar tablas legacy y funciones legacy.
2. Crear migraciones nuevas sin destruir datos.
3. Agregar `legacyId` donde sea necesario.
4. Migrar usuarios primero.
5. Migrar roles/permisos.
6. Migrar perfiles.
7. Migrar catálogo.
8. Migrar horarios y citas.
9. Migrar archivos.
10. Migrar contabilidad.
11. Comparar conteos y checksums.
12. Congelar rutas legacy.
13. Cambiar frontend a `/api/v1`.
14. Retirar `LegacyCompatibilityModule` cuando no existan consumidores.
