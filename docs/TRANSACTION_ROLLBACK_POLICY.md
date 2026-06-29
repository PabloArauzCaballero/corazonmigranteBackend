# Política de transacciones y rollback contra datos fragmentados

Este backend evita que una operación de negocio deje datos incompletos en tablas separadas. La regla es simple:

> Si una acción escribe en más de una tabla, esas escrituras deben ejecutarse dentro de una transacción de base de datos. Si falla una escritura intermedia, PostgreSQL hace rollback automático y ninguna tabla queda con una fracción del dato.

## Qué problema evita

Un mal backend puede hacer esto:

1. Crear usuario en `users`.
2. Fallar al crear `patient_profiles`.
3. Fallar al asignar rol en `user_roles`.
4. Dejar un usuario sin perfil y sin permisos.

Eso se llama dato fragmentado. En producción es grave porque genera registros huérfanos, citas sin historial, transacciones contables incompletas o archivos subidos sin metadata.

## Cómo se implementa en este proyecto

Se usa el patrón de Sequelize:

```ts
return this.model.sequelize!.transaction(async (transaction) => {
  const row = await this.model.create(data, { transaction });
  await this.otherModel.create(otherData, { transaction });
  await this.audit.log(event, { transaction });
  return row;
});
```

Si cualquier `await` dentro del callback lanza error, Sequelize ejecuta `ROLLBACK`. Si todo termina bien, ejecuta `COMMIT`.

## Operaciones cubiertas

| Módulo | Operación | Tablas protegidas |
|---|---|---|
| Auth | Registro de paciente | `users`, `patient_profiles`, `user_roles`, `audit_logs`, `message_outbox` |
| Auth | Registro de terapeuta | `users`, `therapist_profiles`, `user_roles`, `audit_logs` |
| Auth | Login | actualización de `users.last_login_at`, `refresh_tokens` |
| Auth | Refresh token | revocación del token anterior + creación del nuevo token |
| Auth | Recuperación de password | `auth_pins`, `message_outbox` |
| Auth | Reset password | `users`, `auth_pins`, `refresh_tokens`, `audit_logs` |
| Citas | Crear cita | `appointments`, `appointment_status_history`, `audit_logs`, `message_outbox` |
| Citas | Cambiar estado | `appointments`, `appointment_status_history`, `audit_logs`, `message_outbox` |
| Contabilidad | Crear transacción contable | `accounting_transactions`, `accounting_entries`, `audit_logs` |
| Catálogo terapéutico | Crear/editar/eliminar enfoque/producto | tabla principal + `audit_logs` |
| Agenda | Crear horario/bloqueo | tabla principal + `audit_logs` |
| Usuarios | Actualizar perfil | perfil + `audit_logs` |
| CMS | Crear página/agregar elemento | tabla principal + `audit_logs` |
| Archivos | Crear metadata | `files`, `audit_logs` |

## Caso especial: archivos en GCS o disco local

Una base de datos sí puede hacer rollback. Pero Google Cloud Storage y el filesystem no participan en la misma transacción SQL.

Por eso se usa compensación:

1. Se sube el objeto a GCS o storage local.
2. Se abre una transacción SQL para crear metadata y auditoría.
3. Si la transacción SQL falla, el backend intenta borrar el objeto físico ya subido.
4. Así se evita dejar archivos huérfanos sin registro en `files`.

## Qué no se debe hacer

No se debe implementar una operación crítica así:

```ts
const user = await User.create(...);
await Profile.create(...);
await UserRole.create(...);
```

Eso es peligroso porque si falla el segundo o tercer paso, queda información incompleta.

## Criterio de aceptación

Una operación está correctamente protegida si cumple todo esto:

1. Todas sus escrituras de DB usan el mismo objeto `transaction`.
2. Auditoría y outbox se escriben dentro de la misma transacción cuando forman parte de la acción de negocio.
3. Si se escribe fuera de la base de datos, como GCS, existe limpieza compensatoria.
4. No se manda email directamente dentro de la transacción; solo se encola en `message_outbox`.
5. Los workers externos procesan después del commit.

## Cómo validar manualmente

1. Forzar un error después de crear el primer registro dentro de una transacción.
2. Ejecutar el endpoint.
3. Confirmar que no quedó ningún registro parcial en las tablas relacionadas.

Ejemplo conceptual:

```ts
await this.userModel.sequelize!.transaction(async (transaction) => {
  await this.userModel.create(data, { transaction });
  throw new Error('simular fallo');
});
```

Después del error, la tabla `users` no debe tener ese registro.
