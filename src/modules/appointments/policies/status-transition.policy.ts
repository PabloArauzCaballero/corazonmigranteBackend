export const allowedAppointmentTransitions: Record<string, string[]> = {
  REQUESTED: ['CONFIRMED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_ADMIN'],
  CONFIRMED: ['COMPLETED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_THERAPIST', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED_BY_PATIENT: [],
  CANCELLED_BY_ADMIN: [],
  CANCELLED_BY_THERAPIST: [],
  NO_SHOW: [],
};

export function canTransitionAppointment(from: string, to: string): boolean {
  return (allowedAppointmentTransitions[from] ?? []).includes(to);
}
