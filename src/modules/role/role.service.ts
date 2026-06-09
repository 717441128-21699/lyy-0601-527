import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { OperationType } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private operationLogService: OperationLogService,
  ) {}

  async create(userId: string, projectId: string, createRoleDto: CreateRoleDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const existingRole = await this.prisma.projectRole.findUnique({
      where: { projectId_name: { projectId, name: createRoleDto.name } },
    });

    if (existingRole) {
      throw new ConflictException('角色名称已存在');
    }

    const role = await this.prisma.projectRole.create({
      data: {
        ...createRoleDto,
        projectId,
        isSystem: false,
      },
    });

    await this.operationLogService.log(
      userId,
      OperationType.CREATE,
      'ProjectRole',
      role.id,
      `创建了角色: ${role.name}`,
      createRoleDto,
      projectId,
    );

    return role;
  }

  async findAll(projectId: string) {
    return this.prisma.projectRole.findMany({
      where: { projectId },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(projectId: string, id: string) {
    const role = await this.prisma.projectRole.findUnique({
      where: { id, projectId },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    return role;
  }

  async update(userId: string, projectId: string, id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.projectRole.findUnique({
      where: { id, projectId },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    if (role.isSystem) {
      throw new ForbiddenException('系统角色不能修改');
    }

    if (updateRoleDto.name && updateRoleDto.name !== role.name) {
      const existingRole = await this.prisma.projectRole.findUnique({
        where: { projectId_name: { projectId, name: updateRoleDto.name } },
      });

      if (existingRole) {
        throw new ConflictException('角色名称已存在');
      }
    }

    const updated = await this.prisma.projectRole.update({
      where: { id },
      data: updateRoleDto,
    });

    await this.operationLogService.log(
      userId,
      OperationType.UPDATE,
      'ProjectRole',
      id,
      `更新了角色: ${updated.name}`,
      updateRoleDto,
      projectId,
    );

    return updated;
  }

  async remove(userId: string, projectId: string, id: string) {
    const role = await this.prisma.projectRole.findUnique({
      where: { id, projectId },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    if (role.isSystem) {
      throw new ForbiddenException('系统角色不能删除');
    }

    const memberCount = await this.prisma.projectMember.count({
      where: { roleId: id },
    });

    if (memberCount > 0) {
      throw new ConflictException('该角色下还有成员，无法删除');
    }

    await this.prisma.projectRole.delete({ where: { id } });

    await this.operationLogService.log(
      userId,
      OperationType.DELETE,
      'ProjectRole',
      id,
      `删除了角色: ${role.name}`,
      null,
      projectId,
    );

    return { message: '角色已删除' };
  }

  async getPermissionTemplate() {
    return {
      project: {
        view: '查看项目',
        edit: '编辑项目',
        delete: '删除项目',
        manageMembers: '管理成员',
        manageRoles: '管理角色',
      },
      task: {
        view: '查看任务',
        create: '创建任务',
        edit: '编辑任务',
        delete: '删除任务',
        assign: '分配任务',
        changeStatus: '变更状态',
        comment: '评论任务',
      },
      schedule: {
        view: '查看日程',
        create: '创建日程',
        edit: '编辑日程',
        delete: '删除日程',
      },
      file: {
        view: '查看文件',
        upload: '上传文件',
        download: '下载文件',
        delete: '删除文件',
      },
      stats: {
        view: '查看统计',
        export: '导出数据',
      },
    };
  }
}
