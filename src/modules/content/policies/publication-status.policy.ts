import { BadRequestException } from '@nestjs/common';

export const PUBLICATION_STATUSES = ['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'];
export const PUBLICATION_TYPES = ['NEWS', 'COLUMN', 'OPINION', 'INTERVIEW', 'REPORT', 'ANALYSIS'];
export const PUBLIC_ACCESS_TYPES = ['PUBLIC', 'PREMIUM'];

export function normalizePublicationStatus(status?: string) {
  return (status ?? 'DRAFT').toUpperCase();
}

export function assertPublishable(publication: { title: string; summary: string; body: string }) {
  if (!publication.title?.trim() || !publication.summary?.trim() || !publication.body?.trim()) {
    throw new BadRequestException({
      code: 'CONTENT_PUBLICATION_NOT_PUBLISHABLE',
      message: 'La publicación requiere título, resumen y cuerpo antes de publicarse.',
    });
  }
}

export function assertScheduledAtInFuture(scheduledAt: string | Date) {
  const parsed = new Date(scheduledAt);
  if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
    throw new BadRequestException({
      code: 'CONTENT_INVALID_SCHEDULE_DATE',
      message: 'La fecha programada debe ser una fecha futura válida.',
    });
  }
}
