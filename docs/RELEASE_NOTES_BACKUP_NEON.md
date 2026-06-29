# Release notes: job de backup hacia Neon

Se agregó soporte de respaldo lógico hacia una base remota de Neon.

## Agregado

- `scripts/backup-to-neon.js`: ejecuta `pg_dump` contra la base origen y `pg_restore` contra la base remota de Neon.
- `.github/workflows/neon-backup.yml`: job programado diario y ejecutable manualmente.
- `npm run db:backup:neon`: comando oficial del proyecto.
- Variables de entorno para backup en `.env.example` y `.env.production.example`.
- `docs/BACKUP_NEON.md`: guía completa de uso, configuración y recuperación.

## Protecciones

- El script no permite que origen y destino sean iguales.
- El destino debe apuntar a `neon.tech`, salvo que se active `ALLOW_NON_NEON_BACKUP_TARGET=true`.
- Para restaurar en remoto exige `BACKUP_CONFIRM_REMOTE_NEON=true`.
- No se suben dumps como artifact en GitHub Actions; solo el manifest.
