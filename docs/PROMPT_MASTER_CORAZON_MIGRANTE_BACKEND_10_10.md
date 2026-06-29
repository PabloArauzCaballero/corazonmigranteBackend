# PROMPT MASTER 10/10 — Reingeniería Backend Corazón Migrante

## Rol del asistente/programador

Actúa como arquitecto backend senior y desarrollador principal. Tu tarea es reingenierizar el backend legacy de Corazón Migrante hacia un backend profesional, seguro, mantenible y listo para cliente.

No debes limitarte a copiar el backend existente. Debes usarlo como referencia funcional y corregir sus errores de arquitectura, seguridad, rutas, validación, base de datos y operación.

## Stack obligatorio

- Node.js LTS.
- NestJS.
- TypeScript strict.
- PostgreSQL.
- Sequelize con migrations y seeders.
- Redis para cache, rate limit y jobs cuando aplique.
- JWT access token + refresh token rotativo.
- Guards NestJS para Auth/RBAC/ownership.
- DTOs con `class-validator` + `class-transformer` o Zod, pero elegir una estrategia y mantenerla consistente.
- Swagger/OpenAPI completo.
- Tests con Jest + Supertest.
- Docker Compose local con API + Postgres + Redis.
- Configuración por ambiente con `@nestjs/config` y schema de validación.

## Objetivo

Construir una API `/api/v1` limpia que reemplace gradualmente el backend Express legacy. La API debe tener módulos claros, seguridad real, contratos explícitos, migraciones reproducibles, seeders de prueba y documentación suficiente para que frontend y QA trabajen sin adivinar.

## Módulos obligatorios

1. `AuthModule`
2. `UsersModule`
3. `RolesPermissionsModule`
4. `TherapyCatalogModule`
5. `SchedulingModule`
6. `AppointmentsModule`
7. `FilesModule`
8. `CmsModule`
9. `AccountingModule`
10. `MessagingModule`
11. `AuditModule`
12. `AnalyticsModule`
13. `HealthModule`
14. `LegacyCompatibilityModule` temporal

## Reglas no negociables

### Seguridad

- Prohibido confiar en IDs de actor enviados por el frontend.
- Prohibido aceptar `password_hash` desde payload público.
- Prohibido subir secretos al repo.
- Prohibido devolver stack traces al cliente.
- Prohibido loggear passwords, tokens, PINs, private keys, bodies sensibles o cabeceras de autorización.
- Refresh tokens deben persistirse hasheados y poder revocarse.
- PINs deben persistirse hasheados, expirar y tener rate limit.
- Endpoints de admin, contabilidad, CMS y archivos deben usar RBAC.
- Archivos deben validar owner, módulo, MIME, tamaño y extensión.

### Arquitectura

- Controller solo orquesta HTTP, no contiene lógica de negocio.
- Service contiene casos de uso.
- Repository/model contiene persistencia.
- Guards validan auth/RBAC/ownership.
- Interceptors/filters manejan respuestas y errores.
- No usar funciones SQL gigantes como capa de dominio principal.
- Soft delete debe ser consistente (`deletedAt`) salvo tablas de auditoría.
- Usar transacciones DB en operaciones multi-tabla.

### API

- Toda ruta nueva vive en `/api/v1`.
- Usar nombres REST: `GET`, `POST`, `PATCH`, `DELETE` correctamente.
- Todo endpoint debe tener DTO de entrada, DTO de respuesta y ejemplos Swagger.
- Paginación estándar en listados: `page`, `pageSize`, `sort`, `order`, `search`, filtros específicos.
- Respuesta estándar de error.
- No exponer nombres internos legacy como `p_id_sesion`, `p_actor_user_id`, `apagar`, `modificar`.

### Base de datos

- Todas las tablas deben estar en migraciones versionadas.
- Seeders mínimos para probar flujos completos.
- Índices para claves foráneas, búsquedas frecuentes, estado y fechas.
- Constraints para estados permitidos y unicidad.
- No depender de una base manual no reconstruible.

## Secuencia de implementación obligatoria

### Fase 0 — Preparación

- Crear proyecto NestJS limpio.
- Configurar ESLint/Prettier/tsconfig strict.
- Docker Compose Postgres + Redis.
- Config validation.
- Health checks.
- Swagger base.

### Fase 1 — Auth + Users + RBAC

- Migraciones de usuarios, roles, permisos, sesiones/refresh tokens, pins.
- Registro paciente/terapeuta/admin según reglas.
- Login, refresh, logout, recuperación password.
- Guards: `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `OwnerGuard`.
- Tests e2e de seguridad.

### Fase 2 — Catálogo terapéutico + CMS público

- Enfoques y productos.
- Rutas públicas y admin.
- Cache Redis con invalidación.
- Gestión de assets separada.

### Fase 3 — Agenda y citas

- Horarios recurrentes.
- Bloqueos.
- Disponibilidad calculada.
- Creación y estados de cita.
- Historial de estados.
- Validación de solapamientos.

### Fase 4 — Archivos

- Subida segura.
- Metadata en DB.
- Ownership y permisos.
- Signed URLs con TTL.
- Reemplazo de archivos de perfil/catálogo/CMS.

### Fase 5 — Contabilidad y pagos

- Plan de cuentas.
- Centros de costo.
- Transacciones.
- Ventas asociadas a citas/productos.
- Preparar integración futura de pasarela.

### Fase 6 — Mensajería, auditoría y analytics

- Outbox transaccional.
- Worker.
- Logs de envío.
- Auditoría crítica.
- Eventos UI públicos.

### Fase 7 — Compatibilidad y migración final

- Adaptador temporal para rutas legacy críticas.
- Deprecation headers.
- Mapa legacy -> v1.
- Pruebas contra frontend actual.

## Entregables obligatorios por módulo

Cada módulo debe entregar:

1. Migración DB.
2. Modelos Sequelize.
3. DTOs.
4. Controller.
5. Service.
6. Repository cuando aplique.
7. Guards/policies si aplica.
8. Swagger completo.
9. Tests unitarios.
10. Tests e2e mínimos.
11. Seeder o fixture si aplica.
12. README corto del módulo.
13. Pendientes explícitos en `docs/08_backlog/PENDIENTES.md`.

## Criterio de terminado

Un módulo no está terminado si:

- no tiene tests;
- no tiene Swagger;
- no tiene validación;
- depende de IDs de usuario enviados por body;
- no tiene control de permisos;
- rompe compatibilidad básica con frontend sin documentarlo;
- requiere configurar manualmente la DB fuera de migraciones;
- expone secretos o datos sensibles.

---

# Requisito adicional obligatorio: documentación modo docente

La implementación no se considera terminada si el código no queda explicado de forma entendible para un programador nuevo.

Cada módulo debe incluir un `README.md` interno con:

1. propósito del módulo;
2. endpoints que expone;
3. tablas que usa;
4. permisos necesarios;
5. flujo interno principal;
6. ejemplos de request/response;
7. errores esperados;
8. tests existentes;
9. cómo extender el módulo sin romper arquitectura.

Ejemplo de ubicación:

```txt
src/modules/auth/README.md
src/modules/users/README.md
src/modules/appointments/README.md
```

Además, cada caso de uso complejo debe tener comentarios breves que expliquen el “por qué”, no lo obvio.

Ejemplo correcto:

```ts
// Se usa transacción porque crear una cita también crea historial, auditoría y evento outbox.
```

Ejemplo incorrecto:

```ts
// crea una cita
```

La documentación debe servir para enseñar el código, no solo para cumplir.
