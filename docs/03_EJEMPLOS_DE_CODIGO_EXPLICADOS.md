# Ejemplos de código explicados paso a paso

Estos ejemplos no reemplazan la implementación, pero muestran el estilo esperado.

---

## 1. Controller limpio

```ts
@ApiTags('Appointments')
@Controller('/api/v1/appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @RequirePermissions('appointment:create')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createForPatient(user.id, dto);
  }
}
```

### Explicación

- `@Controller` define la ruta base.
- `@UseGuards(JwtAuthGuard)` exige login.
- `@RequirePermissions` exige permiso.
- `@CurrentUser` obtiene usuario desde JWT.
- `@Body` valida con DTO.
- El controller delega al service.

---

## 2. DTO con validación

```ts
export class CreateAppointmentDto {
  @IsUUID()
  therapistUserId: string;

  @IsUUID()
  productId: string;

  @IsISO8601()
  scheduledStartAt: string;

  @IsString()
  @MaxLength(100)
  timezone: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notesForTherapist?: string;
}
```

### Explicación

Este DTO evita que el service reciba datos incompletos o peligrosos.

No incluye `patientUserId` porque el paciente sale del JWT.

---

## 3. Service con transacción

```ts
async createForPatient(patientUserId: string, dto: CreateAppointmentDto) {
  return this.sequelize.transaction(async (transaction) => {
    const product = await this.productsRepo.findActiveById(dto.productId, transaction);
    if (!product) throw AppErrors.productNotFound();

    await this.appointmentPolicy.ensureSlotAvailable({
      therapistUserId: dto.therapistUserId,
      startAt: dto.scheduledStartAt,
      durationMinutes: product.durationMinutes,
      transaction,
    });

    const appointment = await this.appointmentsRepo.create({
      patientUserId,
      therapistUserId: dto.therapistUserId,
      productId: dto.productId,
      scheduledStartAt: dto.scheduledStartAt,
      scheduledEndAt: addMinutes(dto.scheduledStartAt, product.durationMinutes),
      timezone: dto.timezone,
      status: 'REQUESTED',
      price: product.price,
      currency: product.currency,
      notesForTherapist: dto.notesForTherapist,
    }, transaction);

    await this.statusHistoryRepo.create({
      appointmentId: appointment.id,
      fromStatus: null,
      toStatus: 'REQUESTED',
      changedByUserId: patientUserId,
    }, transaction);

    await this.auditService.record({
      actorUserId: patientUserId,
      action: 'appointment.created',
      entityType: 'appointment',
      entityId: appointment.id,
    }, transaction);

    await this.outboxService.enqueue({
      type: 'appointment.created',
      payload: { appointmentId: appointment.id },
    }, transaction);

    return appointment;
  });
}
```

### Explicación

Este service:

1. abre transacción;
2. verifica producto activo;
3. verifica disponibilidad;
4. crea cita;
5. crea historial;
6. registra auditoría;
7. agenda email en outbox;
8. devuelve resultado.

Si cualquier paso falla, la transacción revierte todo.

---

## 4. Policy para reglas de negocio

```ts
export class AppointmentPolicy {
  canCancel(user: AuthUser, appointment: AppointmentModel): boolean {
    const isPatientOwner = appointment.patientUserId === user.id;
    const isAssignedTherapist = appointment.therapistUserId === user.id;
    const isAdmin = user.permissions.includes('appointment:cancel-any');

    const cancellableStatuses = ['REQUESTED', 'CONFIRMED'];

    return (
      cancellableStatuses.includes(appointment.status) &&
      (isPatientOwner || isAssignedTherapist || isAdmin)
    );
  }
}
```

### Explicación

La policy evita que el service se llene de lógica repetida. Además es fácil de probar con unit tests.

---

## 5. Test e2e de permiso

```ts
it('paciente no puede crear producto terapéutico', async () => {
  const patientToken = await authHelper.loginAsPatient();

  await request(app.getHttpServer())
    .post('/api/v1/admin/therapy/products')
    .set('Authorization', `Bearer ${patientToken}`)
    .send({ name: 'Producto no autorizado' })
    .expect(403);
});
```

### Explicación

Este test demuestra que no basta con estar logueado. El paciente no tiene permiso administrativo.
