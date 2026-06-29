# Guía para neófitos — Entender este backend desde cero

Este documento explica el backend como si estuvieras entrando por primera vez a un proyecto profesional. No asume que ya dominas NestJS, APIs, JWT, Redis o PostgreSQL.

---

## 1. Qué es un backend

Un backend es la parte del sistema que vive en el servidor. El usuario no lo ve directamente, pero todo lo importante pasa por él.

En Corazón Migrante, el backend se encarga de:

- registrar usuarios;
- iniciar sesión;
- validar permisos;
- guardar perfiles de pacientes y terapeutas;
- mostrar catálogo de terapias;
- manejar horarios y citas;
- subir y proteger archivos;
- enviar correos;
- registrar auditoría;
- guardar pagos o movimientos contables;
- entregar información al frontend.

El frontend es la pantalla. El backend es el cerebro operativo.

---

## 2. Qué es una API

Una API es un conjunto de puertas de entrada. Cada puerta se llama **endpoint**.

Ejemplo:

```txt
POST /api/v1/auth/login
```

Ese endpoint significa:

- `POST`: se enviará información al backend;
- `/api/v1`: versión de la API;
- `/auth`: módulo de autenticación;
- `/login`: acción de iniciar sesión.

El frontend manda un JSON:

```json
{
  "email": "paciente.demo@example.com",
  "password": "Demo123456!"
}
```

El backend responde otro JSON:

```json
{
  "data": {
    "accessToken": "jwt",
    "user": {
      "id": "uuid",
      "roles": ["PATIENT"]
    }
  }
}
```

---

## 3. Qué es NestJS

NestJS es un framework para construir backends ordenados en Node.js.

Un backend pequeño puede hacerse en Express con rutas sueltas. Pero un backend serio, con usuarios, permisos, citas, archivos, pagos y auditoría, necesita estructura.

NestJS ayuda a separar el código en piezas:

| Pieza | Qué hace | Ejemplo |
|---|---|---|
| Module | Agrupa una parte del sistema | `AuthModule` |
| Controller | Recibe peticiones HTTP | `AuthController` |
| DTO | Define qué datos acepta el endpoint | `LoginDto` |
| Service | Ejecuta la lógica de negocio | `AuthService` |
| Repository/Model | Habla con la base de datos | `UserModel` |
| Guard | Decide si alguien puede entrar | `JwtAuthGuard` |
| Policy | Aplica una regla de negocio | `AppointmentPolicy` |

La regla es simple: **cada archivo tiene una responsabilidad**.

---

## 4. Qué significa “modular”

Un backend modular se divide por dominios del negocio, no por carpetas genéricas sin sentido.

En este proyecto los módulos principales son:

```txt
auth
users
roles-permissions
therapy-catalog
scheduling
appointments
files
cms
accounting
messaging
audit
analytics
health
```

Cada módulo debe poder responder estas preguntas:

1. ¿Qué problema del negocio resuelve?
2. ¿Qué endpoints expone?
3. ¿Qué tablas usa?
4. ¿Qué permisos requiere?
5. ¿Qué pruebas debe tener?

---

## 5. Qué es una base de datos

La base de datos es donde viven los datos permanentes.

Ejemplos:

- usuarios;
- roles;
- perfiles;
- horarios;
- citas;
- archivos;
- pagos;
- auditorías.

En este proyecto se usa PostgreSQL. PostgreSQL guarda datos en tablas.

Ejemplo simplificado de tabla `users`:

| id | email | passwordHash | status |
|---|---|---|---|
| uuid-1 | paciente@example.com | hash-seguro | ACTIVE |

Nunca se guarda la contraseña real. Se guarda un hash.

---

## 6. Qué es una migración

Una migración es un archivo que modifica la estructura de la base de datos.

Ejemplo:

```txt
001_create_users_table.ts
002_create_roles_table.ts
003_create_patient_profiles_table.ts
```

Sirve para que cualquier programador pueda reconstruir la base desde cero sin depender de una base “mágica” que solo existe en producción.

Regla del proyecto:

> Si la base no puede reconstruirse desde cero con migraciones, la entrega no está lista.

---

## 7. Qué es un DTO

DTO significa Data Transfer Object. Es la forma ordenada de decir: “este endpoint acepta estos campos y no otros”.

Ejemplo de `LoginDto`:

```ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

Esto evita que el backend reciba cualquier cosa sin control.

Sin DTOs, el backend se vuelve inseguro y difícil de mantener.

---

## 8. Qué es JWT

JWT es un token que demuestra que el usuario inició sesión.

Después de login, el backend devuelve un `accessToken`. El frontend lo manda en cada petición privada:

```txt
Authorization: Bearer <accessToken>
```

El backend lee ese token y sabe:

- quién es el usuario;
- qué roles tiene;
- si la sesión sigue vigente.

Regla crítica:

> El frontend nunca debe mandar `actorUserId` para decir quién está actuando. El backend debe saberlo desde el JWT.

---

## 9. Qué es RBAC

RBAC significa Role-Based Access Control. Es control de acceso por roles y permisos.

Ejemplo:

| Acción | Paciente | Terapeuta | Admin |
|---|---:|---:|---:|
| Ver catálogo público | Sí | Sí | Sí |
| Editar su propio perfil | Sí | Sí | Sí |
| Aprobar terapeutas | No | No | Sí |
| Cambiar roles | No | No | Solo SuperAdmin |

No basta con que el usuario esté logueado. También debe tener permiso.

---

## 10. Qué es ownership

Ownership significa propiedad.

Ejemplo: un paciente puede ver sus propias citas, pero no las citas de otro paciente.

El backend debe verificar:

```txt
appointment.patientUserId === req.user.id
```

Si no coincide, responde `403 FORBIDDEN`.

---

## 11. Qué es Swagger

Swagger es una documentación visual de la API. Permite ver endpoints, probarlos y entender qué datos esperan.

En este proyecto, todo endpoint debe aparecer en Swagger con:

- descripción;
- request example;
- response example;
- códigos de error;
- permisos requeridos.

---

## 12. Qué son tests

Los tests son pruebas automáticas. Sirven para saber si algo se rompió después de cambiar código.

Tipos:

| Tipo | Qué prueba | Ejemplo |
|---|---|---|
| Unitario | Una función aislada | validar contraseña |
| Integración | Backend + DB | crear usuario en PostgreSQL |
| E2E | Flujo completo HTTP | login y crear cita |
| Smoke | Que el sistema levante | `/health` responde OK |

Un backend sin tests puede funcionar hoy y romper mañana sin que nadie se dé cuenta.

---

## 13. Cómo estudiar el código cuando esté implementado

Sigue este camino:

1. Abre `src/main.ts` para ver cómo arranca la app.
2. Abre `src/app.module.ts` para ver qué módulos existen.
3. Entra a `src/modules/auth` para entender login.
4. Lee primero el controller, luego DTO, luego service.
5. Revisa los guards para entender permisos.
6. Mira los modelos Sequelize para entender tablas.
7. Ejecuta tests del módulo.
8. Abre Swagger y prueba el endpoint.

No empieces leyendo todo al azar. Lee por flujo.

---

## 14. Frase guía

Cada vez que leas un archivo, pregúntate:

> ¿Este archivo recibe datos, valida datos, ejecuta negocio, guarda datos, protege acceso o responde al usuario?

Si no puedes responder eso, el archivo está mal nombrado o mal ubicado.
