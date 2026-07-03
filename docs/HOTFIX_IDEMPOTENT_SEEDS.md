# Hotfix: seeders idempotentes

## Problema

`yarn db:seed` fallaba con:

```txt
ERROR: Validation error
ERROR DETAIL: Key (code)=(users:read) already exists.
```

El origen era `src/database/seeders/20260628010000-demo-data.js`: usaba `bulkInsert` directo sobre tablas con claves únicas (`permissions.code`, `roles.code`, `users.email`, `therapy_approaches.slug`, etc.). En una base ya sembrada o productiva, el seeder intentaba insertar datos existentes y fallaba.

## Corrección aplicada

Se reescribieron los seeders para que sean idempotentes:

- `20260628010000-demo-data.js`
- `20260702011000-seed-content-advertising-demo.js`

Ahora usan:

- `INSERT ... ON CONFLICT DO UPDATE` cuando hay clave única real.
- `INSERT ... ON CONFLICT DO NOTHING` en tablas pivote.
- `SELECT antes de INSERT` cuando no existe una restricción única de negocio segura.
- `down()` no destructivo: elimina solo datos demo conocidos, no toda la base.

## Cómo aplicar

No hace falta deshacer la migración que ya pasó.

Ejecutar:

```powershell
yarn db:seed
```

Luego validar:

```powershell
yarn typecheck
yarn lint
yarn build
yarn test
yarn smoke:newspaper-internal
```
