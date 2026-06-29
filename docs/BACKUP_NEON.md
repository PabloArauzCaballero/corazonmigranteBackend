# Job de backup hacia una base remota de Neon

Este proyecto incluye un job para respaldar la base PostgreSQL principal y restaurarla en **otra base remota de Neon**.

La idea no es guardar un archivo manualmente y olvidarlo. La idea es tener una copia lógica reconstruible en una segunda base, útil para recuperación, auditoría técnica y validación de continuidad.

## Archivos incluidos

```txt
scripts/backup-to-neon.js
.github/workflows/neon-backup.yml
.env.example
.env.production.example
package.json
```

## Cómo funciona

El job hace tres pasos:

```txt
1. Lee la base origen.
2. Ejecuta pg_dump en formato custom.
3. Ejecuta pg_restore sobre la base remota de Neon configurada como destino.
```

El flujo es:

```txt
PostgreSQL producción
  -> pg_dump --format=custom
  -> archivo .dump temporal/local
  -> pg_restore --clean --if-exists
  -> Neon backup database
```

## Variables obligatorias

```env
SOURCE_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/corazon_migrante?sslmode=require
NEON_BACKUP_DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.neon.tech/corazon_migrante_backup?sslmode=require
BACKUP_CONFIRM_REMOTE_NEON=true
```

`SOURCE_DATABASE_URL` puede omitirse en local si ya tienes estas variables:

```env
DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_NAME=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_SSL=true
```

## Variables de seguridad

```env
BACKUP_RESTORE_TO_NEON=true
BACKUP_DIR=backups
BACKUP_LOCAL_RETENTION_DAYS=7
BACKUP_DRY_RUN=false
ALLOW_NON_NEON_BACKUP_TARGET=false
```

### BACKUP_CONFIRM_REMOTE_NEON

Debe estar en `true` para restaurar en la base remota. Es una protección para evitar que alguien ejecute un restore destructivo por accidente.

### ALLOW_NON_NEON_BACKUP_TARGET

Por defecto el script exige que el host destino contenga `neon.tech`. Si quieres usar otra base PostgreSQL como destino, debes poner:

```env
ALLOW_NON_NEON_BACKUP_TARGET=true
```

## Comando local

Primero instala `pg_dump` y `pg_restore`.

En Ubuntu/Debian:

```bash
sudo apt-get update
sudo apt-get install -y postgresql-client
```

Luego ejecuta:

```bash
npm run db:backup:neon
```

## Prueba sin tocar la base destino

Para validar variables y comandos sin ejecutar el backup real:

```bash
BACKUP_DRY_RUN=true npm run db:backup:neon
```

## GitHub Actions

El workflow está en:

```txt
.github/workflows/neon-backup.yml
```

Corre diariamente a las `05:20 UTC` y también se puede ejecutar manualmente con `workflow_dispatch`.

Debes configurar estos secrets en GitHub:

```txt
SOURCE_DATABASE_URL
NEON_BACKUP_DATABASE_URL
```

No los pongas en el código. No los subas al repo. No los escribas en `README.md` real con credenciales.

## Importante sobre el restore

El restore usa:

```bash
pg_restore --clean --if-exists --no-owner --no-acl
```

Eso significa que la base destino se actualiza para parecerse a la base origen. Por eso **la base destino debe ser una base exclusiva de backup**, no una base usada por otra aplicación.

## Cómo verificar que funcionó

Conéctate a la base remota de Neon backup y ejecuta:

```sql
select count(*) from users;
select count(*) from roles;
select count(*) from appointments;
```

También revisa en GitHub Actions que el job haya terminado en verde.

## Qué NO hace este job

Este job no reemplaza una política completa de backups administrados del proveedor. Neon también tiene sus propios mecanismos de branching, PITR o snapshots según el plan contratado. Este job es una capa adicional de respaldo lógico y portabilidad.
