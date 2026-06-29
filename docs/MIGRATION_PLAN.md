# Plan de migración faseado

## Fase 0 — Auditoría congelada

Entregables:

- Inventario de rutas legacy.
- Inventario de funciones SQL legacy.
- Inventario de tablas legacy.
- Riesgos críticos documentados.
- Decisión de qué se migra, qué se elimina y qué queda temporal.

Criterio de salida:

- Nadie implementa rutas nuevas sin saber su equivalente v1.

## Fase 1 — Base NestJS

Entregables:

- Proyecto NestJS.
- Config env validada.
- Docker Compose.
- PostgreSQL + Redis.
- Health check.
- Swagger.
- Error filter global.
- Logger sin secretos.

Criterio de salida:

- API inicia local con un comando.
- Swagger abre.
- Health verifica DB/Redis.

## Fase 2 — Auth/RBAC

Entregables:

- Migraciones auth/users/roles.
- Seed roles/permisos.
- Login/register/refresh/logout.
- Guards.
- Tests e2e.

Criterio de salida:

- Ninguna ruta privada funciona sin JWT.
- Paciente no entra a admin.
- Refresh tokens se rotan.

## Fase 3 — Dominio público y catálogo

Entregables:

- Enfoques/productos.
- CMS público básico.
- Redis cache + invalidación.
- Admin CRUD protegido.

Criterio de salida:

- Visitante ve catálogo activo.
- Admin cambia catálogo y se ve reflejado sin datos viejos.

## Fase 4 — Booking/citas

Entregables:

- Schedules.
- Blocked times.
- Availability.
- Appointments.
- Status history.
- Outbox events.

Criterio de salida:

- No hay doble reserva.
- Transiciones inválidas fallan.
- Paciente/terapeuta solo ve lo que corresponde.

## Fase 5 — Files/CMS completo

Entregables:

- Upload seguro.
- Metadata DB.
- Signed URLs.
- Ownership.
- Assets para perfiles/catálogo/CMS.

Criterio de salida:

- Cliente no define objectKey.
- Un usuario no lee archivos ajenos.

## Fase 6 — Contabilidad

Entregables:

- Plan de cuentas.
- Centros costo.
- Transacciones balanceadas.
- Ventas/citas.

Criterio de salida:

- Contador opera sin acceder a datos privados innecesarios.

## Fase 7 — Retiro legacy

Entregables:

- Front consume v1.
- Rutas legacy con `Sunset`.
- Métricas de uso legacy.
- Eliminación planificada.

Criterio de salida:

- Cero tráfico legacy por periodo acordado.
