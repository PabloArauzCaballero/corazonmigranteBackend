# Auditoría técnica del backend legacy

## Nota de severidad

- **Crítico**: impide entregar a cliente o compromete seguridad.
- **Alto**: rompe mantenibilidad, permisos o despliegue confiable.
- **Medio**: genera deuda técnica importante.
- **Bajo**: limpieza necesaria, pero no bloqueante.

## Hallazgos críticos

| Severidad | Hallazgo | Evidencia | Acción obligatoria |
|---|---|---|---|
| Crítico | Secretos reales dentro del ZIP/repo | `secrets/skilled-acolyte-...json` | Eliminar del repo, rotar clave en Google Cloud, usar Secret Manager/variables de entorno. |
| Crítico | JWT emitido pero no aplicado consistentemente | Rutas de negocio sin guard global. | Implementar `JwtAuthGuard` global por módulo privado. |
| Crítico | Se confía en `p_actor_user_id` y `p_id_sesion` enviados desde frontend | Funciones y servicios reciben actor/session por body. | El actor debe salir exclusivamente de `req.user` derivado del JWT. |
| Crítico | SQL DDL no reconstruye todo lo que el backend invoca | `db_functions.js` lista 87 funciones; DDL define aprox. 35. | Crear migraciones reproducibles y eliminar dependencia de funciones inexistentes/no versionadas. |
| Alto | Rutas no REST y duplicadas | `contabilidad.routes.js` duplica grupos-cuenta; GET implementado con POST/PATCH. | Rediseñar API `/api/v1` con contratos claros. |
| Alto | Validación de payload débil | Controladores pasan `req.body` completo a servicios. | DTOs con `class-validator` o Zod. |
| Alto | Mezcla CommonJS/ESM | `.cjs`, `.mjs`, `module.exports`, `import`. | Migrar a TypeScript/NestJS estricto. |
| Alto | SSL DB inconsistente | `.env.example` indica SSL, pool fuerza `ssl:false`. | Configuración única por ambiente. |
| Alto | Logs sensibles | Logs de env, private key, body, email payload. | Sanitización, Pino/Winston estructurado, no imprimir secretos ni bodies sensibles. |
| Alto | Archivos sin política de propiedad robusta | `targetPath` lo manda cliente. | Storage policy por owner, módulo y uso. |

## Decisión de reingeniería

No se debe continuar parchando Express. El backend legacy se usará como fuente de requerimientos y comportamiento, pero el producto final debe construirse en NestJS + TypeScript con migraciones y contratos verificables.
