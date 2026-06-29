# Cómo leer el proyecto sin perderse

Este documento es una guía de navegación. Su objetivo es que un programador nuevo pueda abrir el backend y saber por dónde empezar.

---

## 1. No empieces por la base de datos

Un error común es abrir primero las tablas y tratar de entender todo desde ahí. Eso abruma.

Primero entiende el negocio:

1. visitantes ven contenido público;
2. pacientes se registran y reservan citas;
3. terapeutas gestionan disponibilidad;
4. admins gestionan catálogo y usuarios;
5. el sistema registra auditoría y envía mensajes.

Luego entiende los módulos.

---

## 2. Ruta de lectura recomendada

Cuando el backend NestJS esté implementado, léelo así:

```txt
src/main.ts
  ↓
src/app.module.ts
  ↓
src/modules/auth/auth.module.ts
  ↓
src/modules/auth/auth.controller.ts
  ↓
src/modules/auth/dto/login.dto.ts
  ↓
src/modules/auth/auth.service.ts
  ↓
src/modules/users/models/user.model.ts
  ↓
src/common/guards/jwt-auth.guard.ts
  ↓
test/e2e/auth.e2e-spec.ts
```

Ese recorrido te enseña el ciclo completo: arranque, módulo, endpoint, validación, lógica, base y prueba.

---

## 3. Qué mirar en cada tipo de archivo

### `*.module.ts`

Pregunta: ¿qué piezas forman este módulo?

Ejemplo mental:

```txt
AuthModule importa UsersModule, JwtModule y ConfigModule.
AuthModule registra AuthController y AuthService.
```

### `*.controller.ts`

Pregunta: ¿qué endpoints HTTP existen?

El controller no debe tener lógica pesada. Debe:

- recibir request;
- aplicar decoradores;
- usar DTOs;
- llamar al service;
- devolver respuesta.

### `dto/*.dto.ts`

Pregunta: ¿qué datos acepta este endpoint?

Un DTO debe validar tipos y reglas simples.

### `*.service.ts`

Pregunta: ¿qué caso de uso ejecuta?

Aquí vive la lógica de aplicación: login, registro, reservar cita, aprobar terapeuta.

### `policies/*.policy.ts`

Pregunta: ¿qué regla de negocio se protege aquí?

Ejemplo: “un paciente solo puede cancelar su cita si está en estado pendiente o confirmada”.

### `models/*.model.ts`

Pregunta: ¿cómo se guarda esto en base de datos?

Aquí deben verse campos, tipos y relaciones.

### `*.spec.ts`

Pregunta: ¿qué comportamiento está garantizado por tests?

Si un módulo no tiene tests, no está listo.

---

## 4. Cómo entender un endpoint completo

Tomemos este endpoint:

```txt
POST /api/v1/appointments
```

Debe tener este camino:

```txt
AppointmentController.create()
  ↓ valida CreateAppointmentDto
JwtAuthGuard verifica token
RolesGuard confirma rol PATIENT
AppointmentService.createAppointment()
AppointmentPolicy.validateCanBook()
AppointmentRepository guarda en DB
AuditService registra evento
OutboxService agenda email
ResponseInterceptor estandariza respuesta
```

Si falta una de estas piezas, hay que preguntarse si es intencional o si es deuda técnica.

---

## 5. Señales de buen código

- Los nombres explican intención.
- El controller es pequeño.
- El service no recibe `req` completo.
- El usuario actual sale de `CurrentUser`, no del body.
- Las reglas de permisos están centralizadas.
- Las transacciones se usan cuando hay varias escrituras.
- Los errores tienen códigos claros.
- Los tests prueban casos felices y fallidos.

---

## 6. Señales de mal código

- Un controller con 200 líneas de lógica.
- Un service que recibe `any` o `req.body` completo.
- Endpoints que aceptan `actorUserId`.
- Rutas tipo `/crear`, `/listar`, `/apagar` en la nueva API.
- Consultas SQL concatenadas con strings.
- Password o token impreso en logs.
- Archivos guardados con rutas que manda el frontend.
- Cambios de estado con strings libres.

---

## 7. Cómo tomar notas mientras estudias

Por cada módulo crea una nota así:

```txt
Módulo: appointments
Responsabilidad: manejar reservas y estados de citas.
Endpoints: POST /appointments, GET /appointments/me, PATCH /appointments/:id/status.
Tablas: appointments, appointment_status_history.
Permisos: appointment:create, appointment:read-own, appointment:update-status.
Tests críticos: no doble reserva, no cancelar cita ajena, transición válida.
```

Si puedes llenar esa ficha, entendiste el módulo.
