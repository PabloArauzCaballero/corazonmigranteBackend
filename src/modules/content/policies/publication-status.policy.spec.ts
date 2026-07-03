import { BadRequestException } from '@nestjs/common';
import { assertPublishable, assertScheduledAtInFuture } from './publication-status.policy';

describe('publication status policy', () => {
  it('rejects incomplete publications before publishing', () => {
    expect(() => assertPublishable({ title: '', summary: 'ok', body: 'ok' })).toThrow(
      BadRequestException,
    );
  });

  it('accepts complete publications before publishing', () => {
    expect(() =>
      assertPublishable({ title: 'Título', summary: 'Resumen', body: 'Cuerpo' }),
    ).not.toThrow();
  });

  it('rejects past schedules', () => {
    expect(() => assertScheduledAtInFuture(new Date(Date.now() - 1000))).toThrow(
      BadRequestException,
    );
  });
});
