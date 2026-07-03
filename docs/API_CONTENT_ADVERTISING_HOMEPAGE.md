# API de contenido, publicidad y homepage

Todas las rutas usan el prefijo global configurado en `API_PREFIX`, por defecto `/api/v1`.

## Público

```txt
GET /publications/news
GET /publications/news/:slug
GET /publications/columns
GET /publications/columns/:slug
GET /publications/categories
GET /publications/tags
GET /advertising/placements
GET /advertising/slots?placementCode=home_hero
GET /homepage
```

## Administración de contenido

Requiere JWT y permisos `content:read` o `content:write`.

```txt
GET   /admin/content/publications
POST  /admin/content/publications
GET   /admin/content/publications/:id
PATCH /admin/content/publications/:id
POST  /admin/content/publications/:id/publish
POST  /admin/content/publications/:id/schedule
POST  /admin/content/publications/:id/archive

GET   /admin/content/categories
POST  /admin/content/categories
PATCH /admin/content/categories/:id

GET   /admin/content/tags
POST  /admin/content/tags

GET   /admin/content/authors
POST  /admin/content/authors
PATCH /admin/content/authors/:id
```

## Administración de publicidad

Requiere JWT y permisos `advertising:read` o `advertising:write`.

```txt
GET   /admin/advertising/companies
POST  /admin/advertising/companies
PATCH /admin/advertising/companies/:id

GET   /admin/advertising/placements
POST  /admin/advertising/placements
PATCH /admin/advertising/placements/:id

GET   /admin/advertising/campaigns
POST  /admin/advertising/campaigns
GET   /admin/advertising/campaigns/:id
PATCH /admin/advertising/campaigns/:id
POST  /admin/advertising/campaigns/:id/status

GET   /admin/advertising/campaigns/:campaignId/creatives
POST  /admin/advertising/campaigns/:campaignId/creatives
PATCH /admin/advertising/creatives/:id
```

## Administración de homepage

Requiere JWT y permisos `homepage:read` o `homepage:write`.

```txt
GET   /admin/homepage/preview
PATCH /admin/homepage/layout
```
