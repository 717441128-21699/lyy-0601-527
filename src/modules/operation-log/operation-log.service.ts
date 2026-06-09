import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationType } from '@prisma/client';

@Injectable()
export class OperationLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string,
    type: OperationType,
    entityType: string,
    entityId: string,
    title: string,
    detail?: Record<string, any>,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.operationLog.create({
      data: {
        userId,
        projectId,
        type,
        entityType,
        entityId,
        title,
        detail,
        ipAddress,
        userAgent,
      },
    });
  }

  async findByProject(projectId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operationLog.count({ where: { projectId } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByUser(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where: { userId },
        include: {
          project: { select: { id: true, name: true, key: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operationLog.count({ where: { userId } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByEntity(entityType: string, entityId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where: { entityType, entityId },
        include: {
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.operationLog.count({ where: { entityType, entityId } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
