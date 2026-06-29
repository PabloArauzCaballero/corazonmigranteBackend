# SYSTEM INFO — Corazón Migrante Backend

## Propósito del sistema

Corazón Migrante es una plataforma digital para conectar pacientes/migrantes con servicios de acompañamiento terapéutico, gestión de terapeutas, administración de contenido público, reserva de citas, seguimiento operativo, pagos/contabilidad básica, archivos e interacciones por mensajería.

El backend debe permitir operar el negocio de forma segura, trazable y escalable. Debe priorizar privacidad, control de acceso y consistencia de datos, porque maneja perfiles personales, datos de contacto, agenda terapéutica y eventualmente información sensible asociada a citas.

## Principios de negocio

1. El visitante puede navegar contenido público y ver catálogo básico sin iniciar sesión.
2. El paciente puede registrarse, verificar su cuenta, gestionar su perfil y solicitar/reservar citas.
3. El terapeuta puede gestionar su perfil, disponibilidad, bloqueos de agenda y citas asignadas.
4. El admin puede administrar catálogo, terapeutas, pacientes, páginas públicas, archivos y solicitudes.
5. El superadmin puede administrar usuarios, estados, permisos, configuración crítica y auditoría.
6. El contador/admin financiero puede gestionar plan de cuentas, centros de costo, transacciones, pagos y ventas asociadas a citas.
7. El sistema debe registrar eventos críticos en auditoría.
8. El sistema debe usar notificaciones/eventos asíncronos para emails, cambios de estado y operaciones no críticas.

## Roles base

| Rol | Descripción | Alcance |
|---|---|---|
| VISITOR | Usuario no autenticado. | Ver contenido público y catálogo público. |
| PATIENT | Paciente registrado/verificado. | Perfil propio, citas propias, archivos propios permitidos. |
| THERAPIST | Terapeuta registrado/aprobado. | Perfil propio, agenda propia, citas asignadas. |
| ADMIN | Operador administrativo. | Gestión de catálogo, CMS, usuarios según permisos. |
| ACCOUNTANT | Rol financiero. | Gestión contable y reportes financieros. |
| SUPER_ADMIN | Dueño operativo. | Control total, permisos, usuarios, configuración crítica. |
| WORKER | Proceso interno. | Outbox, tareas programadas, no expuesto por HTTP público. |

## Dominios principales

| Dominio | Responsabilidad |
|---|---|
| Auth | Login, registro, PIN, refresh tokens, logout, recuperación de contraseña. |
| Users | Identidad base, estados, roles, perfiles paciente/terapeuta/admin. |
| Therapy Catalog | Enfoques, productos/servicios, precios base, assets públicos. |
| Scheduling | Horarios recurrentes, bloqueos, disponibilidad calculada. |
| Appointments | Reserva, confirmación, cancelación, historial de estados, detalle operativo. |
| Files | Upload, metadata, ownership, signed URLs, validaciones MIME/path. |
| CMS/Public | Páginas públicas, elementos UI, assets. |
| Accounting | Grupos, cuentas, centros de costo, transacciones, ventas, pagos. |
| Messaging | Outbox, email, logs de envío, plantillas. |
| Audit | Registro de acciones críticas, seguridad y cambios administrativos. |
| Analytics | Eventos de UI y visitas públicas. |

## Reglas críticas

- El frontend nunca envía `actorUserId`, `sessionId`, `role` ni permisos confiables. Eso sale del JWT y de la base.
- La DB debe poder reconstruirse desde cero con migraciones y seeders.
- No se versionan secretos, certificados ni service accounts.
- Las rutas legacy quedan solo como compatibilidad temporal, no como diseño final.
- Toda acción administrativa debe tener permiso explícito.
- Las citas deben usar transiciones de estado controladas, no strings libres.
- Los archivos deben pertenecer a un owner y a un módulo; no se aceptan paths arbitrarios del cliente.
- Todo endpoint debe tener DTO, validación, Swagger y tests mínimos.
