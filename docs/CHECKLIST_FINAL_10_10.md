# Checklist final 10/10

## Arquitectura

- [ ] NestJS modular.
- [ ] TypeScript strict.
- [ ] Separación controller/service/repository/policy.
- [ ] Sin lógica de negocio pesada en controllers.
- [ ] Sin funciones SQL gigantes como dominio principal.

## Seguridad

- [ ] No hay secretos en repo.
- [ ] JWT guard aplicado a rutas privadas.
- [ ] Refresh tokens rotativos y hasheados.
- [ ] PINs hasheados, expiran y tienen rate limit.
- [ ] RBAC por permisos.
- [ ] Ownership policies.
- [ ] Logs sanitizados.
- [ ] CORS por whitelist.

## API

- [ ] Todas las rutas nuevas en `/api/v1`.
- [ ] REST correcto.
- [ ] DTOs en todos los endpoints.
- [ ] Swagger con ejemplos.
- [ ] Errores estandarizados.
- [ ] Paginación estándar.

## DB

- [ ] DB se reconstruye desde cero.
- [ ] Migrations ordenadas.
- [ ] Seed demo idempotente.
- [ ] FKs e índices.
- [ ] Constraints de estados.
- [ ] Transacciones en operaciones multi-tabla.

## Dominio

- [ ] Registro paciente.
- [ ] Registro terapeuta con aprobación.
- [ ] Login/refresh/logout.
- [ ] Catálogo público.
- [ ] Admin catálogo.
- [ ] Agenda terapeuta.
- [ ] Booking disponibilidad.
- [ ] Citas con historial de estados.
- [ ] Archivos seguros.
- [ ] CMS público/admin.
- [ ] Contabilidad básica.
- [ ] Outbox worker.
- [ ] Auditoría.

## Testing

- [ ] Unit tests.
- [ ] Integration tests DB.
- [ ] E2E auth/RBAC.
- [ ] E2E booking.
- [ ] E2E files.
- [ ] E2E accounting.
- [ ] Smoke tests.
- [ ] Coverage crítico >=80%.

## Entrega

- [ ] README para instalación.
- [ ] `.env.example` completo.
- [ ] Docker Compose.
- [ ] Swagger exportable.
- [ ] Mapa legacy->v1.
- [ ] Pendientes documentados.
- [ ] Sin claims de “10/10” en UI/código.

## Documentación modo docente

- [ ] README principal explica cómo leer el proyecto desde cero.
- [ ] Existe guía para programadores nuevos/neófitos.
- [ ] Cada módulo tiene README interno.
- [ ] Cada endpoint está documentado con request, response, errores y permisos.
- [ ] Cada tabla crítica tiene explicación de propósito y relación.
- [ ] Cada flujo crítico tiene explicación paso a paso.
- [ ] Hay glosario técnico.
- [ ] Hay guía de depuración.
- [ ] Hay ejemplos de código explicados.
- [ ] Hay guía de testing explicada por módulo.
- [ ] Los comentarios del código explican decisiones, no obviedades.
- [ ] No hay frases vagas como “implementar bien” sin criterio verificable.
