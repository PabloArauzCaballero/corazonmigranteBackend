import {
  dejariaSinSuperAdmin,
  puedeActuarSobre,
  puedeAsignarRol,
} from './admin-scope.policy';

describe('puedeAsignarRol', () => {
  it('un admin no puede otorgar SUPER_ADMIN: es la escalada que abría el panel', () =>
    expect(puedeAsignarRol(false, 'SUPER_ADMIN')).toBe(false));
  it('un super admin sí puede otorgarlo', () =>
    expect(puedeAsignarRol(true, 'SUPER_ADMIN')).toBe(true));
  it('un admin puede otorgar el resto de roles', () => {
    for (const rol of ['PATIENT', 'THERAPIST', 'ACCOUNTANT', 'ADMIN'])
      expect(puedeAsignarRol(false, rol)).toBe(true);
  });
});

describe('puedeActuarSobre', () => {
  it('un admin no puede tocar a un super admin', () =>
    expect(puedeActuarSobre(false, true)).toBe(false));
  it('un super admin puede tocar a otro super admin', () =>
    expect(puedeActuarSobre(true, true)).toBe(true));
  it('un admin puede tocar a quien no es super admin', () =>
    expect(puedeActuarSobre(false, false)).toBe(true));
});

describe('dejariaSinSuperAdmin', () => {
  it('bloquea al último: después no entra nadie, ni él', () =>
    expect(dejariaSinSuperAdmin(true, 0)).toBe(true));
  it('deja pasar si queda otro activo', () =>
    expect(dejariaSinSuperAdmin(true, 1)).toBe(false));
  it('no aplica a quien no es super admin, aunque no quede ninguno', () =>
    expect(dejariaSinSuperAdmin(false, 0)).toBe(false));
});
