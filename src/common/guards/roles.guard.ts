import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = request.user?.roles ?? [];
    const allowed = requiredRoles.some((role) => userRoles.includes(role));
    if (!allowed) {
      throw new ForbiddenException({
        code: 'RBAC_ROLE_DENIED',
        message: 'No tiene el rol requerido.',
      });
    }
    return true;
  }
}
