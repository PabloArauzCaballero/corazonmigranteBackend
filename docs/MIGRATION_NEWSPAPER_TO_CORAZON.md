# Migración Newspaper -> Corazón Migrante

## Decisión final

Newspaper fue integrado como funcionalidad interna de Corazón Migrante mediante un monolito modular. No se conserva un segundo backend ni se copió el proyecto Newspaper dentro de una carpeta aislada.

## Qué se absorbió

- Publicaciones editoriales: noticias, columnas, opiniones, reportajes y análisis.
- Taxonomía editorial: categorías y etiquetas.
- Autores editoriales desacoplados de `users` mediante `content_authors`.
- Publicidad: empresas anunciantes, placements, campañas y creativos.
- Homepage: composición pública de titulares, columnas, publicidad y layout administrable.

## Qué NO se absorbió

- Autenticación de Newspaper.
- Usuarios de Newspaper.
- Roles/permisos de Newspaper como implementación separada.
- Auditoría propia de Newspaper.
- Cache y SQL crudo de Newspaper.
- Pagos, suscripciones, comentarios, reacciones y workers específicos del periódico.

Esas piezas no se copiaron porque Corazón Migrante ya tiene infraestructura propia o porque no eran necesarias para la absorción funcional actual.

## Módulos agregados

```txt
src/modules/content
src/modules/advertising
src/modules/homepage
```

Cada módulo tiene controladores, DTOs, servicios, mappers y políticas pequeñas para evitar clases grandes.

## Tablas agregadas

```txt
content_authors
content_categories
content_tags
content_publications
content_publication_tags
ads_companies
ads_placements
ads_campaigns
ads_campaign_creatives
ads_campaign_placements
ads_campaign_content_targets
ads_impressions
homepage_sections
homepage_featured_items
```

## Migraciones y seeds

```bash
yarn db:migrate
yarn db:seed
```

Archivos nuevos:

```txt
src/database/migrations/20260702010000-integrate-newspaper-content-advertising-homepage.js
src/database/seeders/20260702011000-seed-content-advertising-demo.js
```

El seed agrega permisos:

```txt
content:read
content:write
advertising:read
advertising:write
homepage:read
homepage:write
```

Y roles operativos:

```txt
EDITOR
ADVERTISING_MANAGER
```

También otorga permisos a `SUPER_ADMIN` y `ADMIN`.

## Criterio de calidad aplicado

- Sin carpeta `/newspaper`.
- Sin SQL crudo para la lógica nueva.
- Modelos `sequelize-typescript` registrados en `databaseModels`.
- DTOs con `class-validator`.
- Servicios separados por responsabilidad.
- Políticas testeadas para publicaciones y campañas.
- Auditoría en escrituras críticas.
- Permisos por endpoint administrativo.
- Endpoints públicos marcados con `@Public()`.
