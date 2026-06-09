import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageService } from '../message/message.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  QueryScheduleDto,
  CheckAvailabilityDto,
} from './dto/schedule.dto';
import { OperationType } from '@prisma/client';

@Injectable()
export class ScheduleService {
  constructor(
    private prisma: PrismaService,
    private messageService: MessageService,
    private operationLogService: OperationLogService,
  ) {}

  async create(userId: string, projectId: string | undefined, createScheduleDto: CreateScheduleDto) {
    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId, deletedAt: null },
      });
      if (!project) {
        throw new NotFoundException('项目不存在');
      }
    }

    const startTime = new Date(createScheduleDto.startTime);
    const endTime = new Date(createScheduleDto.endTime);

    if (startTime >= endTime) {
      throw new ForbiddenException('结束时间必须晚于开始时间');
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        ...createScheduleDto,
        projectId,
        userId,
        startTime,
        endTime,
      },
    });

    if (createScheduleDto.attendees && createScheduleDto.attendees.length > 0) {
      const notifyUserIds = createScheduleDto.attendees.filter((uid) => uid !== userId);
      if (notifyUserIds.length > 0) {
        await this.messageService.createMany(
          notifyUserIds,
          'SCHEDULE_REMINDER',
          `您被邀请参加日程`,
          `您被邀请参加日程: ${schedule.title}`,
          userId,
          schedule.id,
          'Schedule',
        );
      }
    }

    await this.operationLogService.log(
      userId,
      OperationType.CREATE,
      'Schedule',
      schedule.id,
      `创建了日程: ${schedule.title}`,
      createScheduleDto,
      projectId,
    );

    return this.findOne(schedule.id);
  }

  async findAll(userId: string, projectId: string | undefined, query: QueryScheduleDto) {
    const { page = 1, pageSize = 20, startDate, endDate, type } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (projectId) {
      where.projectId = projectId;
    } else {
      where.userId = userId;
    }

    if (startDate) {
      where.startTime = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.endTime = { lte: new Date(endDate) };
    }

    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
          project: { select: { id: true, name: true, key: true, color: true } },
        },
        skip,
        take: pageSize,
        orderBy: [{ startTime: 'asc' }],
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findMySchedules(userId: string, startDate?: string, endDate?: string) {
    const where: any = {
      deletedAt: null,
      OR: [{ userId }, { attendees: { has: userId } }],
    };

    if (startDate) {
      where.startTime = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.endTime = { lte: new Date(endDate) };
    }

    return this.prisma.schedule.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
        project: { select: { id: true, name: true, key: true, color: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
        project: { select: { id: true, name: true, key: true, color: true } },
      },
    });

    if (!schedule) {
      throw new NotFoundException('日程不存在');
    }

    return schedule;
  }

  async update(userId: string, id: string, updateScheduleDto: UpdateScheduleDto) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id, deletedAt: null },
    });

    if (!schedule) {
      throw new NotFoundException('日程不存在');
    }

    if (schedule.userId !== userId) {
      throw new ForbiddenException('只有日程创建者可以修改日程');
    }

    const startTime = updateScheduleDto.startTime ? new Date(updateScheduleDto.startTime) : schedule.startTime;
    const endTime = updateScheduleDto.endTime ? new Date(updateScheduleDto.endTime) : schedule.endTime;

    if (startTime >= endTime) {
      throw new ForbiddenException('结束时间必须晚于开始时间');
    }

    const updated = await this.prisma.schedule.update({
      where: { id },
      data: {
        ...updateScheduleDto,
        startTime: updateScheduleDto.startTime ? new Date(updateScheduleDto.startTime) : undefined,
        endTime: updateScheduleDto.endTime ? new Date(updateScheduleDto.endTime) : undefined,
      },
    });

    if (updateScheduleDto.attendees && updateScheduleDto.attendees.length > 0) {
      const notifyUserIds = updateScheduleDto.attendees.filter((uid) => uid !== userId);
      if (notifyUserIds.length > 0) {
        await this.messageService.createMany(
          notifyUserIds,
          'SCHEDULE_REMINDER',
          `日程已更新`,
          `日程 "${updated.title}" 已更新`,
          userId,
          updated.id,
          'Schedule',
        );
      }
    }

    await this.operationLogService.log(
      userId,
      OperationType.UPDATE,
      'Schedule',
      id,
      `更新了日程: ${updated.title}`,
      updateScheduleDto,
      schedule.projectId,
    );

    return this.findOne(id);
  }

  async remove(userId: string, id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id, deletedAt: null },
    });

    if (!schedule) {
      throw new NotFoundException('日程不存在');
    }

    if (schedule.userId !== userId) {
      throw new ForbiddenException('只有日程创建者可以删除日程');
    }

    await this.prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (schedule.attendees && schedule.attendees.length > 0) {
      const notifyUserIds = schedule.attendees.filter((uid) => uid !== userId);
      if (notifyUserIds.length > 0) {
        await this.messageService.createMany(
          notifyUserIds,
          'SCHEDULE_REMINDER',
          `日程已取消`,
          `日程 "${schedule.title}" 已被取消`,
          userId,
          schedule.id,
          'Schedule',
        );
      }
    }

    await this.operationLogService.log(
      userId,
      OperationType.DELETE,
      'Schedule',
      id,
      `删除了日程: ${schedule.title}`,
      null,
      schedule.projectId,
    );

    return { message: '日程已删除' };
  }

  async checkAvailability(
    userId: string,
    projectId: string | undefined,
    checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    const { startTime, endTime, excludeId, userIds } = checkAvailabilityDto;

    const start = new Date(startTime);
    const end = new Date(endTime);

    const where: any = {
      deletedAt: null,
      startTime: { lt: end },
      endTime: { gt: start },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (userIds && userIds.length > 0) {
      where.OR = [
        { userId: { in: userIds } },
        { attendees: { hasSome: userIds } },
      ];
    } else {
      where.OR = [{ userId }, { attendees: { has: userId } }];
    }

    const conflictingSchedules = await this.prisma.schedule.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
      },
    });

    const checkUserIds = userIds || [userId];
    const userConflicts: Record<string, typeof conflictingSchedules> = {};

    for (const uid of checkUserIds) {
      userConflicts[uid] = conflictingSchedules.filter(
        (s) => s.userId === uid || s.attendees.includes(uid),
      );
    }

    return {
      isAvailable: conflictingSchedules.length === 0,
      conflictingSchedules,
      userConflicts,
    };
  }

  async getUpcomingReminders(userId: string) {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.schedule.findMany({
      where: {
        deletedAt: null,
        startTime: { gte: now, lte: next24Hours },
        OR: [{ userId }, { attendees: { has: userId } }],
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
        project: { select: { id: true, name: true, key: true, color: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    });
  }
}
