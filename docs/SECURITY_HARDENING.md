# Seguridad, privacidad y hardening

## Threat model mínimo

| Riesgo | Mitigación obligatoria |
|---|---|
| Robo de JWT | Access token corto, refresh rotativo hasheado, logout/revocation. |
| Enumeración de usuarios | Respuestas genéricas en login/recuperación. |
| Fuerza bruta de PIN/password | Rate limit por IP+email, bloqueo temporal, logs de seguridad. |
| Escalada de privilegios | Guards RBAC y ownership. No confiar en body. |
| Acceso a archivos ajenos | FilePolicy con owner/module/entity. Signed URL con TTL. |
| Secretos en repo | `.gitignore`, secret scanning, Secret Manager. |
| SQL injection | Sequelize parametrizado, no concatenar SQL dinámico. |
| XSS por CMS | Sanitizar contenido, allowlist de HTML si aplica. |
| Datos clínicos expuestos | Minimización, separación de notas privadas, permisos estrictos. |
| Logs sensibles | Sanitización y redacción. |

## JWT claims permitidos

```json
{
  "sub": "userUuid",
  "email": "user@example.com",
  "roles": ["PATIENT"],
  "sessionId": "uuid",
  "iat": 123,
  "exp": 456
}
```

No incluir datos sensibles ni permisos completos si el token puede crecer demasiado. Los permisos pueden cachearse por sesión con invalidación al cambiar roles.

## Passwords

- Hash con Argon2id o bcrypt cost adecuado.
- Política mínima: 8 caracteres, mayúscula/minúscula/número/símbolo recomendada.
- No devolver passwordHash nunca.
- Cambios de password revocan refresh tokens existentes.

## PINs

- Guardar `pinHash`, nunca PIN plano.
- Expiración corta: 10-15 minutos.
- Intentos máximos: 5.
- Rate limit por email+IP.
- Respuesta genérica si email no existe.

## Headers y CORS

- Helmet habilitado.
- CORS por whitelist de frontend en env.
- `X-Request-Id` obligatorio/generado.
- No exponer `x-powered-by`.

## Archivos

- Allowlist MIME por módulo:
  - imágenes públicas: `image/jpeg`, `image/png`, `image/webp`.
  - documentos privados si aplica: PDF máximo configurado.
- Tamaño máximo configurable.
- `objectKey`: `module/yyyy/mm/entity/id/uuid.ext` generado por backend.
- No aceptar `../`, paths absolutos ni bucket desde cliente.
- Signed URL con TTL corto.

## Auditoría obligatoria

Auditar:

- login fallido repetido;
- cambio password;
- cambio rol/permiso;
- cambio estado usuario;
- aprobación terapeuta;
- CRUD catálogo;
- creación/cambio/cancelación cita;
- acceso a archivo privado sensible;
- transacción contable;
- publicación CMS.
