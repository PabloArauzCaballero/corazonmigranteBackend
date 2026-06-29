# Hotfix smoke profundo Windows

Este parche corrige `scripts/smoke-deep.ps1` para Windows PowerShell.

## Problema corregido

PowerShell lanzaba `AmpersandNotAllowed` en la URL de disponibilidad porque el script podia quedar mal interpretado al combinar caracteres UTF-8, emojis y query strings con `&`.

## Correccion aplicada

- El script fue convertido a texto ASCII puro.
- Se eliminaron emojis de consola.
- La URL `/booking/availability` ahora se arma por concatenacion segura.
- El parametro `timezone` se envia como `America%2FLa_Paz`.

## Comando recomendado

```powershell
yarn smoke:deep:win -- -AllowMutations
```

Si quieres evitar upload GCS durante la primera prueba:

```powershell
yarn smoke:deep:win -- -AllowMutations -SkipFileUpload
```
