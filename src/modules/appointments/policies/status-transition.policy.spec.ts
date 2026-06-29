import { canTransitionAppointment } from './status-transition.policy';
describe('canTransitionAppointment', () => {
  it('permite REQUESTED -> CONFIRMED', () =>
    expect(canTransitionAppointment('REQUESTED', 'CONFIRMED')).toBe(true));
  it('rechaza COMPLETED -> CONFIRMED', () =>
    expect(canTransitionAppointment('COMPLETED', 'CONFIRMED')).toBe(false));
});
