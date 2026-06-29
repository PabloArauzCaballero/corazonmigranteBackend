# Glosario técnico explicado con lenguaje simple

Este glosario traduce términos técnicos del proyecto a explicaciones claras.

| Término | Explicación simple | Ejemplo en el proyecto |
|---|---|---|
| Backend | Servidor que contiene reglas, datos y seguridad. | API de Corazón Migrante. |
| Frontend | Pantalla que usa el usuario. | Web donde el paciente reserva cita. |
| API | Conjunto de endpoints que el frontend consume. | `/api/v1/auth/login`. |
| Endpoint | Ruta concreta de la API. | `GET /api/v1/therapists`. |
| HTTP method | Verbo que indica intención. | GET lee, POST crea, PATCH modifica. |
| DTO | Clase que valida datos de entrada. | `CreateAppointmentDto`. |
| Entity/Model | Representación de una tabla en código. | `UserModel`. |
| Migration | Archivo que crea o modifica tablas. | `create-users-table`. |
| Seeder | Archivo que inserta datos iniciales. | roles demo. |
| JWT | Token de sesión firmado. | access token del login. |
| Refresh token | Token para renovar sesión. | se guarda hasheado en DB. |
| Guard | Filtro de seguridad antes del endpoint. | `JwtAuthGuard`. |
| RBAC | Permisos por roles. | Admin puede aprobar terapeuta. |
| Ownership | Verificar dueño del recurso. | paciente solo ve sus citas. |
| Policy | Regla de negocio aislada. | no cancelar cita ya finalizada. |
| Service | Clase que ejecuta caso de uso. | `AppointmentService`. |
| Repository | Clase/capa que consulta DB. | buscar cita por ID. |
| Transaction | Operación atómica en DB. | crear cita + historial + auditoría. |
| Audit log | Registro de acción importante. | cambio de rol. |
| Outbox | Tabla/cola para eventos pendientes. | enviar email luego de reservar cita. |
| Redis | Memoria rápida para cache o sesiones. | cache de permisos. |
| Swagger | Documentación interactiva de API. | probar login desde navegador. |
| Unit test | Prueba de una función aislada. | validar transición de estado. |
| E2E test | Prueba de flujo completo. | login + reservar cita. |
| Smoke test | Prueba rápida de salud. | `/health` responde OK. |
| Soft delete | Marcar como eliminado sin borrar físico. | `deletedAt`. |
| Hard delete | Borrar definitivamente. | evitar salvo datos temporales. |
| Idempotente | Puede ejecutarse varias veces sin duplicar. | seed de roles. |
| Rate limit | Límite de intentos. | login máximo por IP. |
| CORS | Controla qué frontend puede llamar la API. | dominio oficial permitido. |
| Secret | Credencial sensible. | API key, service account. |
| Environment variable | Configuración fuera del código. | `DATABASE_URL`. |
| CI | Validación automática en GitHub. | correr tests al hacer PR. |
