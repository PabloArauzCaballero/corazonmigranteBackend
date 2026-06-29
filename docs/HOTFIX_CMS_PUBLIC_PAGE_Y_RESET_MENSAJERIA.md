# Hotfix: CMS publico 500 y reset de mensajeria en Neon

## Problema 1
`GET /api/v1/public/pages/inicio` devolvia 500 porque `CmsService.getPublicPage` usaba `include + order` con `sequelize-typescript`:

```ts
include: [CmsElement],
order: [[CmsElement, 'sortOrder', 'ASC']] as any,
```

En algunos escenarios el alias generado por Sequelize para la relacion `HasMany` no coincide con el usado en `order`, provocando error SQL interno.

## Correccion
Ahora el endpoint usa dos consultas simples:

1. Busca la pagina publicada por slug.
2. Busca los elementos activos por `pageId`, ordenados por `sortOrder` y `createdAt`.

Esto evita errores por alias de asociaciones.

## Problema 2
`yarn db:reset` podia fallar en Neon con:

```txt
cannot drop table mensajeria.mensaje_outbox because other objects depend on it
function mensajeria.fn_lock_next_outbox_batch(integer,text) depends on type mensajeria.mensaje_outbox
```

## Correccion
El `down` de la migracion ahora elimina primero funciones dependientes y luego tablas/schema:

```sql
DROP FUNCTION IF EXISTS mensajeria.fn_lock_next_outbox_batch(integer, text) CASCADE;
DROP FUNCTION IF EXISTS mensajeria.fn_lock_next_outbox_batch(integer) CASCADE;
DROP TABLE IF EXISTS mensajeria.mensaje_envio_log CASCADE;
DROP TABLE IF EXISTS mensajeria.mensaje_outbox CASCADE;
DROP SCHEMA IF EXISTS mensajeria CASCADE;
```

## Verificacion rapida

```powershell
yarn build
yarn db:reset
yarn db:migrate
yarn db:seed
yarn start:dev
```

En otra terminal:

```powershell
yarn smoke:deep
```
