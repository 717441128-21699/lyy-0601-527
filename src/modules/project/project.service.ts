import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageService } from '../message/message.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { CreateProjectDto, UpdateProjectDto, InviteMemberDto, QueryProjectDto } from './dto/project.dto';
import { ProjectStatus, OperationType } from '@prisma/client';

const DEFAULT_ROLE_PERMISSIONS = {
  OWNER: {
    project: { view: true, edit: true, delete: true, manageMembers: true, manageRoles: true },
    task: { view: true, create: true, edit: true, delete: true, assign: true, changeStatus: true, comment: true },
    schedule: { view: true, create: true, edit: true, delete: true },
    file: { view: true, upload: true, download: true, delete: true },
    stats: { view: true, export: true },
  },
  ADMIN: {
    project: { view: true, edit: true, delete: false, manageMembers: true, manageRoles: true },
    task: { view: true, create: true, edit: true, delete: true, assign: true, changeStatus: true, comment: true },
    schedule: { view: true, create: true, edit: true, delete: true },
    file: { view: true, upload: true, download: true, delete: true },
    stats: { view: true, export: true },
  },
  MEMBER: {
    project: { view: true, edit: false, delete: false, manageMembers: false, manageRoles: false },
    task: { view: true, create: true, edit: true, delete: false, assign: true, changeStatus: true, comment: true },
    schedule: { view: true, create: true, edit: true, delete: true },
    file: { view: true, upload: true, download: true, delete: false },
    stats: { view: true, export: false },
  },
  VIEWER: {
    project: { view: true, edit: false, delete: false, manageMembers: false, manageRoles: false },
    task: { view: true, create: false, edit: false, delete: false, assign: false, changeStatus: false, comment: true },
    schedule: { view: true, create: false, edit: false, delete: false },
    file: { view: true, upload: false, download: true, delete: false },
    stats: { view: true, export: false },
  },
  GUEST: {
    project: { view: true, edit: false, delete: false, manageMembers: false, manageRoles: false },
    task: { view: false, create: false, edit: false, delete: false, assign: false, changeStatus: false, comment: false },
    schedule: { view: false, create: false, edit: false, delete: false },
    file: { view: false, upload: false, download: false, delete: false },
    stats: { view: false, export: false },
  },
};

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private messageService: MessageService,
    private operationLogService: OperationLogService,
  ) {}

  async create(userId: string, createProjectDto: CreateProjectDto) {
    const existingProject = await this.prisma.project.findUnique({
      where: { key: createProjectDto.key },
    });

    if (existingProject) {
      throw new ConflictException('项目标识已存在');
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          ...createProjectDto,
          startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : undefined,
          endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : undefined,
          ownerId: userId,
        },
      });

      await tx.projectRole.createMany({
        data: [
          { projectId: p.id, name: 'OWNER', isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.OWNER, description: '项目所有者' },
          { projectId: p.id, name: 'ADMIN', isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, description: '项目管理员' },
          { projectId: p.id, name: 'MEMBER', isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER, description: '普通成员' },
          { projectId: p.id, name: 'VIEWER', isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.VIEWER, description: '查看者' },
          { projectId: p.id, name: 'GUEST', isSystem: true, permissions: DEFAULT_ROLE_PERMISSIONS.GUEST, description: '访客' },
        ],
      });

      const ownerRole = await tx.projectRole.findFirst({
        where: { projectId: p.id, name: 'OWNER' },
      });

      await tx.projectMember.create({
        data: {
          projectId: p.id,
          userId,
          roleId: ownerRole?.id,
          invitedBy: userId,
        },
      });

      return p;
    });

    await this.operationLogService.log(
      userId,
      OperationType.CREATE,
      'Project',
      project.id,
      `创建了项目: ${project.name}`,
      project,
      project.id,
    );

    return this.findOne(project.id);
  }

  async findAll(userId: string, query: QueryProjectDto) {
    const { page = 1, pageSize = 20, status, keyword } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
      members: { some: { userId } },
    };

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { key: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, username: true, fullName: true, avatar: true } },
          _count: { select: { members: true, tasks: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, username: true, fullName: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, fullName: true, avatar: true, email: true } },
            role: { select: { id: true, name: true } },
          },
        },
        roles: { select: { id: true, name: true, description: true, isSystem: true, permissions: true } },
        _count: { select: { members: true, tasks: true, milestones: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    return project;
  }

  async update(userId: string, id: string, updateProjectDto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...updateProjectDto,
        startDate: updateProjectDto.startDate ? new Date(updateProjectDto.startDate) : undefined,
        endDate: updateProjectDto.endDate ? new Date(updateProjectDto.endDate) : undefined,
      },
    });

    await this.operationLogService.log(
      userId,
      OperationType.UPDATE,
      'Project',
      id,
      `更新了项目: ${updated.name}`,
      updateProjectDto,
      id,
    );

    if (updateProjectDto.name || updateProjectDto.description || updateProjectDto.status) {
      const members = await this.prisma.projectMember.findMany({
        where: { projectId: id, userId: { not: userId } },
        select: { userId: true },
      });

      if (members.length > 0) {
        await this.messageService.createMany(
          members.map((m) => m.userId),
          'PROJECT_UPDATED',
          `项目已更新`,
          `项目 "${project.name}" 的信息已被更新`,
          userId,
          id,
          'Project',
        );
      }
    }

    return this.findOne(id);
  }

  async remove(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('只有项目所有者可以删除项目');
    }

    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.operationLogService.log(
      userId,
      OperationType.DELETE,
      'Project',
      id,
      `删除了项目: ${project.name}`,
      null,
      id,
    );

    return { message: '项目已删除' };
  }

  async inviteMember(userId: string, projectId: string, inviteMemberDto: InviteMemberDto) {
    const [project, operator] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId, deletedAt: null },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, fullName: true },
      }),
    ]);

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (!operator) {
      throw new NotFoundException('操作人不存在');
    }

    const { userIdentifier, roleId } = inviteMemberDto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: userIdentifier }, { email: userIdentifier }, { username: userIdentifier }],
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const existingMember = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });

    if (existingMember) {
      throw new ConflictException('该用户已是项目成员');
    }

    let targetRoleId = roleId;
    if (!targetRoleId) {
      const defaultRole = await this.prisma.projectRole.findFirst({
        where: { projectId, name: 'MEMBER' },
      });
      targetRoleId = defaultRole?.id;
    }

    const targetRole = await this.prisma.projectRole.findUnique({
      where: { id: targetRoleId },
      select: { id: true, name: true },
    });

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        roleId: targetRoleId,
        invitedBy: userId,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true, email: true } },
        role: { select: { id: true, name: true } },
        invitedByUser: { select: { id: true, username: true, fullName: true } },
      },
    });

    const operatorName = operator.fullName || operator.username;
    const targetUserName = user.fullName || user.username;

    await this.messageService.create(
      user.id,
      'MEMBER_INVITED',
      `您被邀请加入项目 ${project.name}`,
      `${operatorName} 邀请您加入项目 "${project.name}"，角色为: ${targetRole?.name || '成员'}`,
      userId,
      projectId,
      'Project',
    );

    await this.operationLogService.log(
      userId,
      OperationType.INVITE,
      'ProjectMember',
      member.id,
      `${operatorName} 邀请了成员 ${targetUserName} 加入项目，角色: ${targetRole?.name || '成员'}`,
      {
        operatorId: userId,
        operatorName,
        targetUserId: user.id,
        targetUserName,
        roleId: targetRoleId,
        roleName: targetRole?.name,
      },
      projectId,
    );

    return member;
  }

  async removeMember(userId: string, projectId: string, memberId: string) {
    const [project, operator] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId, deletedAt: null },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, fullName: true },
      }),
    ]);

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (!operator) {
      throw new NotFoundException('操作人不存在');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: { id: memberId, projectId },
      include: { user: true, role: true },
    });

    if (!member) {
      throw new NotFoundException('项目成员不存在');
    }

    if (member.role?.name === 'OWNER') {
      throw new ForbiddenException('不能移除项目所有者');
    }

    await this.prisma.projectMember.delete({ where: { id: memberId } });

    const operatorName = operator.fullName || operator.username;
    const targetUserName = member.user.fullName || member.user.username;

    await this.messageService.create(
      member.userId,
      'SYSTEM',
      `您已被移出项目 ${project.name}`,
      `${operatorName} 将您移出了项目 "${project.name}"`,
      userId,
      projectId,
      'Project',
    );

    await this.operationLogService.log(
      userId,
      OperationType.REMOVE,
      'ProjectMember',
      memberId,
      `${operatorName} 移除了成员 ${targetUserName}`,
      {
        operatorId: userId,
        operatorName,
        targetUserId: member.userId,
        targetUserName,
        oldRole: member.role?.name,
      },
      projectId,
    );

    return { message: '成员已移除' };
  }

  async getMembers(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true, email: true } },
        role: { select: { id: true, name: true, description: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async updateMemberRole(userId: string, projectId: string, memberId: string, roleId: string) {
    const [project, operator] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId, deletedAt: null },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, fullName: true },
      }),
    ]);

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (!operator) {
      throw new NotFoundException('操作人不存在');
    }

    const member = await this.prisma.projectMember.findUnique({
      where: { id: memberId, projectId },
      include: { user: true, role: true },
    });

    if (!member) {
      throw new NotFoundException('项目成员不存在');
    }

    const role = await this.prisma.projectRole.findUnique({
      where: { id: roleId, projectId },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    const updated = await this.prisma.projectMember.update({
      where: { id: memberId },
      data: { roleId },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
        role: { select: { id: true, name: true } },
      },
    });

    const operatorName = operator.fullName || operator.username;
    const targetUserName = member.user.fullName || member.user.username;
    const oldRoleName = member.role?.name || '无';
    const newRoleName = role.name;

    if (member.userId !== userId) {
      await this.messageService.create(
        member.userId,
        'SYSTEM',
        `您在项目 ${project.name} 的角色已变更`,
        `${operatorName} 将您在项目 "${project.name}" 的角色从 ${oldRoleName} 变更为 ${newRoleName}`,
        userId,
        projectId,
        'Project',
      );
    }

    await this.operationLogService.log(
      userId,
      OperationType.PERMISSION_CHANGE,
      'ProjectMember',
      memberId,
      `${operatorName} 更新了成员 ${targetUserName} 的角色: ${oldRoleName} -> ${newRoleName}`,
      {
        operatorId: userId,
        operatorName,
        targetUserId: member.userId,
        targetUserName,
        oldRole: oldRoleName,
        newRole: newRoleName,
      },
      projectId,
    );

    return updated;
  }
}
