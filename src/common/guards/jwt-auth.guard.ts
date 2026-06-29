import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'AUTH_MISSING_TOKEN', message: 'Token requerido.' });
    }

    const token = header.slice('Bearer '.length);
    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_ACCESS_SECRET });
      request.user = {
        sub: payload.sub,
        email: payload.email,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        status: payload.status,
      };
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_TOKEN',
        message: 'Token inválido o expirado.',
      });
    }
  }
}
