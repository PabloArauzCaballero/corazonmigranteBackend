# Cómo depurar errores en este backend

Este documento enseña a investigar problemas sin adivinar.

---

## 1. Primero identifica el tipo de error

| Síntoma | Posible causa |
|---|---|
| 400 | DTO inválido o campos faltantes. |
| 401 | No hay token o está expirado. |
| 403 | Usuario autenticado sin permiso. |
| 404 | Recurso no existe o no es visible para ese usuario. |
| 409 | Conflicto de negocio, por ejemplo horario ocupado. |
| 500 | Error no controlado o bug. |

---

## 2. Usa `requestId`

Cada respuesta debe incluir `requestId`. Ese ID debe aparecer en logs.

Flujo:

```txt
Frontend reporta requestId → backend busca log → se identifica módulo/endpoint/error
```

---

## 3. Cómo depurar login

Revisa:

1. email normalizado a lowercase;
2. usuario existe;
3. status permite login;
4. password compare funciona;
5. refresh token se guarda hasheado;
6. access token tiene `sub` correcto;
7. respuesta no contiene `passwordHash`.

---

## 4. Cómo depurar permisos

Revisa:

1. token válido;
2. usuario activo;
3. roles cargados;
4. permisos cargados;
5. decorator `@RequirePermissions` correcto;
6. guard aplicado en controller;
7. ownership si aplica.

---

## 5. Cómo depurar citas

Revisa:

1. producto activo;
2. terapeuta aprobado;
3. horario del terapeuta cubre la fecha;
4. no hay bloqueos;
5. no hay cita solapada;
6. timezone correcto;
7. transacción crea cita + historial + auditoría.

---

## 6. Cómo depurar archivos

Revisa:

1. tamaño permitido;
2. MIME permitido;
3. owner correcto;
4. objectKey generado por backend;
5. bucket correcto;
6. signed URL no expirada;
7. otro usuario no puede leer archivo ajeno.

---

## 7. Qué NO hacer

- No resolver errores desactivando guards.
- No aceptar `actorUserId` del body para “arreglar rápido”.
- No meter SQL manual sin migración.
- No imprimir tokens o passwords en logs.
- No cambiar estados directamente en DB sin historial.
