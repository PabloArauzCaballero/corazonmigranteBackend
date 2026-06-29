# Estándares de código para que cualquiera entienda el backend

Este documento define cómo debe escribirse el código para que sea claro, mantenible y fácil de explicar.

---

## 1. Nombres claros

Malo:

```ts
async process(data: any) {}
```

Bueno:

```ts
async createAppointment(patientUserId: string, dto: CreateAppointmentDto) {}
```

El nombre debe decir qué hace la función.

---

## 2. Nada de `any` sin justificación

`any` elimina la ventaja de TypeScript.

Malo:

```ts
function update(payload: any) {}
```

Bueno:

```ts
function update(dto: UpdateTherapistProfileDto) {}
```

---

## 3. Controllers pequeños

Un controller no debe parecer un service.

Correcto:

```ts
@Post()
create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
  return this.appointmentsService.create(user.id, dto);
}
```

Incorrecto:

```ts
@Post()
async create(@Req() req) {
  // validar manualmente
  // consultar DB
  // verificar permisos
  // enviar email
  // responder
}
```

---

## 4. Services con casos de uso explícitos

Un service no debe llamarse solo `execute`. Debe reflejar negocio:

- `registerPatient`;
- `approveTherapist`;
- `createAppointment`;
- `cancelAppointment`;
- `createTherapyProduct`.

---

## 5. Errores con códigos estables

No lanzar errores genéricos sin código.

Malo:

```ts
throw new Error('No se puede');
```

Bueno:

```ts
throw new AppException({
  code: 'APPOINTMENT_SLOT_UNAVAILABLE',
  message: 'El horario seleccionado ya no está disponible.',
  status: 409,
});
```

---

## 6. Comentarios útiles

No comentar lo obvio.

Malo:

```ts
// incrementa i
for (let i = 0; i < items.length; i++) {}
```

Bueno:

```ts
// Se usa transacción porque la cita, historial y auditoría deben crearse juntos.
await this.sequelize.transaction(async (transaction) => {});
```

---

## 7. Regla de archivo único

Un archivo debe tener una responsabilidad principal.

Si un archivo hace demasiadas cosas, dividirlo.

---

## 8. Orden recomendado dentro de service

```txt
1. Validar existencia de recursos
2. Verificar permisos/ownership si aplica
3. Aplicar reglas de negocio
4. Ejecutar transacción
5. Registrar auditoría/outbox
6. Devolver DTO de respuesta
```

---

## 9. Qué revisar en Pull Request

- ¿Los nombres son claros?
- ¿Hay DTOs?
- ¿Hay guards?
- ¿No se acepta actor desde body?
- ¿Hay tests?
- ¿Hay Swagger?
- ¿La DB tiene migración?
- ¿No hay secretos?
- ¿Los errores son estables?
