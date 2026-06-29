# Corazón Migrante Backend — Prompt Pack de Reingeniería 10/10 modo docente

Este paquete no es solamente una lista de instrucciones. Es una **guía de trabajo, estudio e implementación** para reconstruir el backend de Corazón Migrante con criterio profesional.

La documentación fue escrita con un objetivo muy claro: que una persona que recién está entrando al proyecto, incluso si todavía es programador junior, pueda entender:

1. qué hace el sistema;
2. por qué el backend anterior debe ser reingenierizado;
3. cómo debe quedar la nueva arquitectura;
4. cómo se divide el código por módulos;
5. cómo fluye una petición desde el frontend hasta la base de datos;
6. cómo se valida, autoriza, audita y responde cada operación;
7. cómo probar que el backend realmente funciona;
8. cómo evitar repetir los errores del backend legacy.

---

## Cómo usar este paquete

Lee los documentos en este orden. El orden importa porque están pensados como una clase progresiva.

| Orden | Documento | Para qué sirve |
|---:|---|---|
| 1 | `GUIA_PARA_NEOFITOS.md` | Explica el proyecto como si fuera la primera vez que ves un backend serio. |
| 2 | `SYSTEM_INFO_CORAZON_MIGRANTE.md` | Define el negocio, usuarios, roles y módulos. |
| 3 | `docs/00_legacy_audit/LEGACY_CODE_TOUR.md` | Explica el backend viejo archivo por archivo y por qué se reemplaza. |
| 4 | `docs/01_architecture/TARGET_ARCHITECTURE.md` | Explica la arquitectura NestJS y cómo leer las carpetas. |
| 5 | `docs/01_architecture/FLOW_REQUEST_RESPONSE.md` | Muestra el recorrido completo de una petición HTTP. |
| 6 | `docs/02_database/DATABASE_MODEL_AND_MIGRATIONS.md` | Explica la base de datos, tablas, relaciones, migraciones e índices. |
| 7 | `docs/03_api/API_CONTRACTS_DTO.md` | Explica endpoints, DTOs, validaciones, respuestas y errores. |
| 8 | `docs/04_security/SECURITY_HARDENING.md` | Explica JWT, RBAC, ownership, archivos y seguridad. |
| 9 | `docs/04_security/RBAC_ENDPOINT_MATRIX.md` | Dice qué rol puede llamar cada endpoint. |
| 10 | `docs/05_testing/TESTING_STRATEGY.md` | Enseña cómo probar unidad, integración, e2e y smoke. |
| 11 | `docs/06_devops/DEVOPS_ENV_CI.md` | Explica ambiente, Docker, variables, CI y despliegue. |
| 12 | `docs/09_learning_guide/` | Carpeta tipo curso para entender el código paso a paso. |
| 13 | `PROMPT_MASTER_CORAZON_MIGRANTE_BACKEND_10_10.md` | Prompt final para implementar el backend sin desviarse. |
| 14 | `CHECKLIST_FINAL_10_10.md` | Lista de validación antes de entregar al cliente. |

---

## Regla central del proyecto

El backend legacy sirve como **referencia funcional**, no como arquitectura a copiar.

La nueva versión debe implementarse con:

```txt
NestJS + TypeScript strict + Sequelize + PostgreSQL + Redis + JWT + RBAC + Swagger + Jest
```

Y debe evitar estos errores del backend viejo:

- rutas sin autenticación real;
- `actorUserId` enviado desde el frontend;
- lógica de negocio escondida en funciones SQL gigantes;
- secretos dentro del repositorio;
- rutas tipo `/crear`, `/listar`, `/apagar` sin estándar REST;
- payloads sin DTO ni validación;
- ausencia de tests reales;
- ausencia de documentación contractual.

---

## Qué significa “documentación profesional” en este paquete

Una documentación profesional no se limita a decir “crear endpoint”. Debe explicar:

- **qué problema resuelve** cada módulo;
- **qué archivos intervienen**;
- **qué datos recibe**;
- **qué datos devuelve**;
- **quién tiene permiso**;
- **qué pasa si algo falla**;
- **qué pruebas demuestran que funciona**;
- **qué errores comunes debe evitar el programador**.

Por eso este paquete incluye documentos de arquitectura, seguridad, base de datos, testing, compatibilidad y una guía docente para entender el código.

---

## Resultado esperado de la reingeniería

Al terminar la implementación, el backend debe poder demostrarse así:

1. se levanta con Docker Compose;
2. corre migraciones desde cero;
3. carga seeds demo;
4. expone Swagger en `/docs` o `/api/docs`;
5. permite registrar y loguear usuarios;
6. aplica JWT y permisos correctamente;
7. permite administrar catálogo terapéutico;
8. permite manejar disponibilidad y citas;
9. controla archivos por propiedad;
10. registra auditoría;
11. ejecuta tests unitarios, integración y e2e;
12. no contiene secretos ni datos sensibles versionados.

---

## Advertencia importante

Este paquete describe cómo debe quedar el backend profesional. Si un programador implementa algo que contradice estos documentos, especialmente en seguridad, DTOs, permisos, migraciones o pruebas, debe corregirse antes de entregar al cliente.
