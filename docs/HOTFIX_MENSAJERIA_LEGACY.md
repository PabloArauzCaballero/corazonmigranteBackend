# Hotfix: mensajería alineada al esquema real legacy

Este hotfix corrige la desalineación anterior del módulo de mensajes.

## Antes
El backend reingenierizado estaba creando tablas nuevas:

- `message_outbox`
- `message_send_logs`

Eso no respetaba el diseño legacy de Corazón Migrante, donde mensajería vive en:

- `mensajeria.mensaje_outbox`
- `mensajeria.mensaje_envio_log`

## Ahora
Los modelos Sequelize apuntan explícitamente a:

- `schema: mensajeria`
- `tableName: mensaje_outbox`
- `tableName: mensaje_envio_log`

La API mantiene endpoints en inglés por compatibilidad nueva:

- `/api/v1/admin/messaging/outbox`
- `/api/v1/admin/messaging/test-email`

Y añade alias en español:

- `/api/v1/admin/mensajeria/outbox`
- `/api/v1/admin/mensajeria/test-email`

## Smoke externo corregido
El smoke ya no procesa todo el outbox acumulado. Ahora:

1. Crea un solo mensaje de prueba.
2. Toma su `id_mensaje`.
3. Procesa exactamente ese mensaje con:

```http
POST /api/v1/admin/mensajeria/outbox/:id/process
```

Esto evita mezclar correos viejos, fallidos o acumulados.

## Reinicio recomendado en Neon
Si estabas usando la versión anterior con `message_outbox`, en desarrollo ejecuta:

```bash
yarn db:reset
```

Luego:

```bash
yarn db:migrate
yarn db:seed
yarn start:dev
yarn smoke:deep -- --mutations --external
```

## Verificación SQL
En Neon debe existir:

```sql
select count(*) from mensajeria.mensaje_outbox;
select count(*) from mensajeria.mensaje_envio_log;
```

No debe depender de `message_outbox` ni `message_send_logs`.
