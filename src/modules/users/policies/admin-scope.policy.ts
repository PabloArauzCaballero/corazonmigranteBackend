/**
 * Hasta dónde llega un administrador sobre otro.
 *
 * El panel lo abren `ADMIN` y `SUPER_ADMIN` por igual —el controlador los deja
 * pasar a los dos con `@Roles('ADMIN', 'SUPER_ADMIN')`—, así que el guardia de
 * la ruta no distingue entre ellos. Todo lo que separa un escalón del otro se
 * decide acá.
 *
 * Son funciones puras a propósito: el servicio resuelve quién es quién contra
 * la base y estas deciden. Así la regla se prueba sin levantar Sequelize.
 */

/**
 * Otorgar `SUPER_ADMIN` es alcanzar el techo de privilegio del sistema, y sólo
 * puede hacerlo quien ya está en él. Sin esta regla, un `ADMIN` mandaba
 * `role: 'SUPER_ADMIN'` en el cuerpo de un alta o una edición y se promovía a
 * sí mismo.
 */
export function puedeAsignarRol(actorEsSuperAdmin: boolean, roleCode: string): boolean {
  if (roleCode !== 'SUPER_ADMIN') return true;
  return actorEsSuperAdmin;
}

/**
 * Un `ADMIN` no puede administrar a un `SUPER_ADMIN`. Suspenderlo, cambiarle el
 * rol y borrarlo son la misma jugada —neutralizar a quien está por encima—, y
 * la suspensión además le revoca las sesiones abiertas.
 */
export function puedeActuarSobre(
  actorEsSuperAdmin: boolean,
  objetivoEsSuperAdmin: boolean,
): boolean {
  if (!objetivoEsSuperAdmin) return true;
  return actorEsSuperAdmin;
}

/**
 * Impide la jugada que no tiene vuelta atrás desde la aplicación: dejar cero
 * super admins activos. Un super admin sí puede suspenderse o degradarse a sí
 * mismo —es su cuenta—, pero no siendo el último, porque después nadie, él
 * incluido, vuelve a entrar al panel.
 */
export function dejariaSinSuperAdmin(
  objetivoEsSuperAdmin: boolean,
  otrosSuperAdminsActivos: number,
): boolean {
  if (!objetivoEsSuperAdmin) return false;
  return otrosSuperAdminsActivos === 0;
}
