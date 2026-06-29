# Backlog real después de la implementación NestJS

Este archivo ya no describe lo que faltaba en el backend legacy. Describe únicamente lo que queda como mejora para operación real de cliente.

## P0 — Antes de producción real

- [ ] Rotar/eliminar credenciales Google Cloud que fueron expuestas en el backend legacy original.
- [ ] Ejecutar `npm run build`, `npm run db:migrate`, `npm run smoke` en el servidor objetivo.
- [ ] Crear secrets reales en Secret Manager / plataforma de despliegue.
- [ ] Configurar dominio real, HTTPS y CORS exacto.
- [ ] Probar envío real SendGrid con dominio autenticado.
- [ ] Probar bucket GCS real con Service Account de mínimo privilegio.

## P1 — MVP cliente

- [ ] Conectar frontend real a `/api/v1`.
- [ ] Mapear rutas legacy exactas si el frontend todavía consume endpoints antiguos.
- [ ] Añadir pruebas e2e por cada módulo crítico, no solo auth.
- [ ] Definir plantillas HTML finales de email.
- [ ] Agregar CI/CD con build, lint, test y migraciones controladas.

## P2 — Operación seria

- [ ] Observabilidad: logs estructurados, métricas y trazas.
- [ ] Rate limit distribuido usando Redis para login/reset password.
- [ ] Backups y restore drill de PostgreSQL.
- [ ] Políticas de retención de auditoría y archivos.
- [ ] Exportaciones contables y reportes administrativos avanzados.

## P3 — Evolución futura

- [ ] Pasarela de pagos.
- [ ] Recordatorios automáticos por email/WhatsApp.
- [ ] Plantillas email administrables desde CMS.
- [ ] Panel de métricas avanzado.
