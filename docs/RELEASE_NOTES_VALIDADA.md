# Release notes — versión validada

## Cambios principales

- NestJS actualizado a versión 11.
- Dependencias productivas auditadas sin vulnerabilidades high.
- `package-lock.json` incluido.
- Redis implementado y validado desde healthcheck.
- GCS y SendGrid quedan integrados por provider configurable.
- Migración inicial corregida.
- Script `npm run smoke` añadido.

## Advertencia honesta

Esta release compila y pasa tests unitarios en este entorno. La validación e2e completa requiere Postgres/Redis reales.
