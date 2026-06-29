# Hotfix CMS público: `/public/pages/inicio` devolvía 500

## Problema

El smoke profundo fallaba en:

```txt
GET /api/v1/public/pages/inicio
```

con:

```txt
500 INTERNAL_SERVER_ERROR
```

La API, DB, Redis, auth, RBAC y catálogo estaban funcionando. El fallo estaba aislado al CMS público.

## Causa

El servicio CMS usaba un `include` con ordenamiento directo:

```ts
include: [CmsElement],
order: [[CmsElement, 'sortOrder', 'ASC']] as any,
```

En esta combinación de `sequelize-typescript` + alias generado por `@HasMany`, el `order` del modelo incluido puede generar un SQL inválido o una asociación ambigua en runtime. Por eso el endpoint devolvía 500 aunque la página `inicio` existiera.

## Corrección

Se reemplazó la consulta con `include` por dos consultas explícitas:

1. Buscar la página publicada por `slug`.
2. Buscar sus elementos activos por `pageId` ordenados por `sortOrder`.

Esto evita ambigüedad de alias y mantiene la respuesta esperada:

```json
{
  "id": "...",
  "slug": "inicio",
  "title": "Inicio",
  "status": "PUBLISHED",
  "elements": []
}
```

## Validación esperada

Después de aplicar el hotfix:

```bash
yarn build
yarn smoke:deep
```

Debe pasar el paso:

```txt
[STEP] Publico: catalogo, CMS y queries clasicas page/limit
[OK] CMS publico inicio disponible
```

## Nota sobre Windows

Los scripts principales de smoke en esta versión deben usar Node.js, no Bash:

```bash
yarn smoke:deep
yarn smoke:deep:mutations
yarn smoke:deep:external
```

Si algún comando intenta ejecutar `/bin/bash`, el `package.json` local no está actualizado o quedó mezclado con una versión anterior.
