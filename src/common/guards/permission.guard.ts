import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY, PermissionRequirement } from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const projectId = request.params.projectId || request.body.projectId;

    if (!userId || !projectId) {
      return true;
    }

    const member = await this.prisma.projectMember.findFirst({
      where: { userId, projectId },
      include: { role: true },
    });

    if (!member) {
      throw new ForbiddenException('您不是该项目成员');
    }

    if (!member.role) {
      throw new ForbiddenException('您没有访问权限');
    }

    const permissions = member.role.permissions as Record<string, Record<string, boolean>>;

    if (!permissions?.[requirement.module]?.[requirement.action]) {
      throw new ForbiddenException(`您没有 ${requirement.module}.${requirement.action} 权限`);
    }

    return true;
  }
}
