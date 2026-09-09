import { CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole } from '../database/entities';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const roles = (Reflect.getMetadata(ROLES_KEY, context.getHandler()) ?? Reflect.getMetadata(ROLES_KEY, context.getClass())) as UserRole[] | undefined;
    return !roles || roles.includes(context.switchToHttp().getRequest().user?.role);
  }
}
