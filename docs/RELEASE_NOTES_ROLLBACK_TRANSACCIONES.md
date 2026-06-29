# Release notes - Rollback contra transacciones fragmentadas

Se añadió protección explícita contra datos fragmentados en operaciones que escriben en múltiples tablas.

## Cambios principales

- `AuditService.log` ahora acepta `transaction`.
- `MessagingService.enqueue` ahora acepta `transaction`.
- `RolesPermissionsService.assignRoleByCode` ahora acepta `transaction`.
- Registro de paciente y terapeuta queda atómico.
- Login, refresh token, logout y reset password quedan transaccionales.
- Creación y cambio de estado de citas ahora incluye cita + historial + auditoría + outbox en la misma transacción.
- Creación de transacción contable ahora incluye cabecera + asientos + auditoría en la misma transacción.
- Catálogo, agenda, CMS y perfiles ahora guardan cambios + auditoría de forma atómica.
- Upload de archivos ahora usa transacción para metadata + auditoría y limpieza compensatoria si falla la persistencia después de subir el objeto.

## Validación ejecutada

```bash
npm run build
npm run lint
npm run build
npm test -- --runInBand
npm audit --omit=dev --audit-level=high
```

Resultado: build, lint y tests OK; sin vulnerabilidades HIGH en dependencias productivas.
