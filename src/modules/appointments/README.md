# AppointmentsModule

## Propósito

Crea citas usando identidad JWT, valida disponibilidad y registra historial/auditoría/outbox.

## Endpoints principales

- `POST /api/v1/appointments`
- `GET /api/v1/appointments/mine`
- `PATCH /api/v1/appointments/:id/status`

## Cómo leer este módulo

1. El controller recibe HTTP y valida DTOs.
2. El service ejecuta el caso de uso.
3. Los modelos Sequelize guardan/leen datos.
4. Guards globales validan JWT, roles y permisos antes del service.

## Reglas docentes

- No pongas lógica de negocio en el controller.
- No confíes en IDs de actor enviados por frontend.
- Si una acción cambia datos importantes, registra auditoría.
- Si una acción debe notificar a alguien, crea evento en `message_outbox`.
