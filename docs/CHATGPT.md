# Prompt rápido — Implementar backend desde cero

Usa el paquete de reingeniería 10/10 de Corazón Migrante. Implementa un backend NestJS + TypeScript strict + Sequelize + PostgreSQL + Redis siguiendo estrictamente:

1. `PROMPT_MASTER_CORAZON_MIGRANTE_BACKEND_10_10.md`
2. `docs/01_architecture/TARGET_ARCHITECTURE.md`
3. `docs/02_database/DATABASE_MODEL_AND_MIGRATIONS.md`
4. `docs/03_api/API_CONTRACTS_DTO.md`
5. `docs/04_security/RBAC_ENDPOINT_MATRIX.md`
6. `CHECKLIST_FINAL_10_10.md`

No copies el diseño Express legacy. Úsalo solo como referencia funcional. No confíes en actor/session enviados desde el frontend. Cada módulo debe incluir DTOs, guards, Swagger, migraciones, seeders y tests.

## Requisito docente adicional

Además de implementar, deja documentación entendible para un programador junior:

- README por módulo.
- Comentarios que expliquen decisiones importantes.
- Swagger con ejemplos.
- Tests con nombres descriptivos.
- No uses nombres genéricos como `data`, `payload` o `process` cuando exista un nombre de negocio más claro.
