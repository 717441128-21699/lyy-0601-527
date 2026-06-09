import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageService } from '../message/message.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ChangeTaskStatusDto,
  CreateTaskCommentDto,
  QueryTaskDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
} from './dto/task.dto';
import { TaskStatus, OperationType, MessageType } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class TaskService {
  constructor(
    private prisma: PrismaService,
    private messageService: MessageService,
    private operationLogService: OperationLogService,
  ) {}

  async create(userId: string, projectId: string, createTaskDto: CreateTaskDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (createTaskDto.parentId) {
      const parentTask = await this.prisma.task.findUnique({
        where: { id: createTaskDto.parentId, projectId, deletedAt: null },
      });
      if (!parentTask) {
        throw new NotFoundException('父任务不存在');
      }
    }

    if (createTaskDto.milestoneId) {
      const milestone = await this.prisma.milestone.findUnique({
        where: { id: createTaskDto.milestoneId, projectId },
      });
      if (!milestone) {
        throw new NotFoundException('里程碑不存在');
      }
    }

    if (createTaskDto.assigneeId) {
      const member = await this.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: createTaskDto.assigneeId } },
      });
      if (!member) {
        throw new NotFoundException('处理人不是项目成员');
      }
    }

    const maxPosition = await this.prisma.task.aggregate({
      where: { projectId, deletedAt: null, parentId: createTaskDto.parentId || null },
      _max: { position: true },
    });

    const task = await this.prisma.task.create({
      data: {
        ...createTaskDto,
        projectId,
        creatorId: userId,
        startDate: createTaskDto.startDate ? new Date(createTaskDto.startDate) : undefined,
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : undefined,
        position: (maxPosition._max.position || 0) + 1,
      },
    });

    if (createTaskDto.assigneeId && createTaskDto.assigneeId !== userId) {
      await this.messageService.create(
        createTaskDto.assigneeId,
        'TASK_ASSIGNED',
        `您被分配了新任务`,
        `您被分配了新任务: ${task.title}`,
        userId,
        task.id,
        'Task',
      );
    }

    await this.operationLogService.log(
      userId,
      OperationType.CREATE,
      'Task',
      task.id,
      `创建了任务: ${task.title}`,
      createTaskDto,
      projectId,
    );

    return this.findOne(task.id);
  }

  async findAll(projectId: string, query: QueryTaskDto) {
    const {
      page = 1,
      pageSize = 20,
      status,
      priority,
      assigneeId,
      creatorId,
      milestoneId,
      keyword,
      tag,
      includeSubtasks = false,
    } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {
      projectId,
      deletedAt: null,
    };

    if (!includeSubtasks) {
      where.parentId = null;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (milestoneId) {
      where.milestoneId = milestoneId;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          creator: { select: { id: true, username: true, fullName: true, avatar: true } },
          assignee: { select: { id: true, username: true, fullName: true, avatar: true } },
          milestone: { select: { id: true, name: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
        skip,
        take: pageSize,
        orderBy: [{ priority: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findMyTodos(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const where: any = {
      assigneeId: userId,
      deletedAt: null,
      status: { notIn: ['DONE', 'CANCELLED'] },
    };

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, key: true, color: true } },
          creator: { select: { id: true, username: true, fullName: true, avatar: true } },
          milestone: { select: { id: true, name: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
        skip,
        take: pageSize,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      }),
      this.prisma.task.count({ where }),
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
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, key: true, color: true } },
        creator: { select: { id: true, username: true, fullName: true, avatar: true } },
        assignee: { select: { id: true, username: true, fullName: true, avatar: true } },
        milestone: { select: { id: true, name: true, targetDate: true } },
        parent: { select: { id: true, title: true, status: true } },
        subtasks: {
          include: {
            creator: { select: { id: true, username: true, fullName: true, avatar: true } },
            assignee: { select: { id: true, username: true, fullName: true, avatar: true } },
          },
          orderBy: [{ position: 'asc' }],
        },
        statusHistories: {
          include: {
            changedBy: { select: { id: true, username: true, fullName: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          include: {
            user: { select: { id: true, username: true, fullName: true, avatar: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          select: { id: true, name: true, originalName: true, size: true, type: true, createdAt: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    return task;
  }

  async update(userId: string, id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const oldAssigneeId = task.assigneeId;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...updateTaskDto,
        startDate: updateTaskDto.startDate ? new Date(updateTaskDto.startDate) : undefined,
        dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : undefined,
      },
    });

    if (updateTaskDto.assigneeId && updateTaskDto.assigneeId !== oldAssigneeId && updateTaskDto.assigneeId !== userId) {
      await this.messageService.create(
        updateTaskDto.assigneeId,
        'TASK_ASSIGNED',
        `您被分配了新任务`,
        `您被分配了任务: ${updated.title}`,
        userId,
        updated.id,
        'Task',
      );
    }

    if (updateTaskDto.assigneeId || updateTaskDto.status || updateTaskDto.priority || updateTaskDto.dueDate) {
      const watchers = await this.prisma.taskComment.findMany({
        where: { taskId: id },
        select: { userId: true },
        distinct: ['userId'],
      });

      const notifyUserIds = watchers
        .map((w) => w.userId)
        .filter((uid) => uid !== userId && uid !== updateTaskDto.assigneeId);

      if (notifyUserIds.length > 0) {
        await this.messageService.createMany(
          notifyUserIds,
          'TASK_UPDATED',
          `任务已更新`,
          `任务 "${updated.title}" 的信息已被更新`,
          userId,
          updated.id,
          'Task',
        );
      }
    }

    await this.operationLogService.log(
      userId,
      OperationType.UPDATE,
      'Task',
      id,
      `更新了任务: ${updated.title}`,
      updateTaskDto,
      task.projectId,
    );

    return this.findOne(id);
  }

  async changeStatus(userId: string, id: string, changeStatusDto: ChangeTaskStatusDto) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.status === changeStatusDto.status) {
      return this.findOne(id);
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.taskStatusHistory.create({
        data: {
          taskId: id,
          oldStatus: task.status,
          newStatus: changeStatusDto.status,
          changedById: userId,
          remark: changeStatusDto.remark,
        },
      }),
      this.prisma.task.update({
        where: { id },
        data: {
          status: changeStatusDto.status,
          completedAt: changeStatusDto.status === TaskStatus.DONE ? new Date() : null,
        },
      }),
    ]);

    if (task.assigneeId && task.assigneeId !== userId) {
      await this.messageService.create(
        task.assigneeId,
        'TASK_UPDATED',
        `任务状态已变更`,
        `任务 "${task.title}" 的状态已从 ${task.status} 变更为 ${changeStatusDto.status}`,
        userId,
        id,
        'Task',
      );
    }

    if (changeStatusDto.status === TaskStatus.DONE && task.assigneeId !== userId) {
      await this.messageService.create(
        userId,
        'TASK_COMPLETED',
        `任务已完成`,
        `您创建的任务 "${task.title}" 已完成`,
        task.assigneeId,
        id,
        'Task',
      );
    }

    await this.operationLogService.log(
      userId,
      OperationType.STATUS_CHANGE,
      'Task',
      id,
      `变更了任务状态: ${task.status} -> ${changeStatusDto.status}`,
      { oldStatus: task.status, newStatus: changeStatusDto.status, remark: changeStatusDto.remark },
      task.projectId,
    );

    return this.findOne(id);
  }

  async remove(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    if (task.creatorId !== userId) {
      throw new ForbiddenException('只有任务创建者可以删除任务');
    }

    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.operationLogService.log(
      userId,
      OperationType.DELETE,
      'Task',
      id,
      `删除了任务: ${task.title}`,
      null,
      task.projectId,
    );

    return { message: '任务已删除' };
  }

  async addComment(userId: string, taskId: string, createCommentDto: CreateTaskCommentDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
    });

    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const comment = await this.prisma.taskComment.create({
      data: {
        ...createCommentDto,
        taskId,
        userId,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
      },
    });

    if (createCommentDto.mentions && createCommentDto.mentions.length > 0) {
      await this.messageService.createMany(
        createCommentDto.mentions.filter((uid) => uid !== userId),
        'MENTION',
        `您在评论中被提及`,
        `在任务 "${task.title}" 的评论中被提及`,
        userId,
        taskId,
        'TaskComment',
      );
    }

    const otherWatchers = await this.prisma.taskComment.findMany({
      where: { taskId, userId: { not: userId } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const notifyUserIds = otherWatchers
      .map((w) => w.userId)
      .filter((uid) => !createCommentDto.mentions?.includes(uid) && uid !== task.assigneeId);

    if (task.assigneeId && task.assigneeId !== userId && !createCommentDto.mentions?.includes(task.assigneeId)) {
      notifyUserIds.push(task.assigneeId);
    }

    if (notifyUserIds.length > 0) {
      await this.messageService.createMany(
        notifyUserIds,
        'TASK_COMMENTED',
        `任务有新评论`,
        `任务 "${task.title}" 有新评论`,
        userId,
        taskId,
        'TaskComment',
      );
    }

    await this.operationLogService.log(
      userId,
      OperationType.COMMENT,
      'TaskComment',
      comment.id,
      `在任务 "${task.title}" 中添加了评论`,
      createCommentDto,
      task.projectId,
    );

    return comment;
  }

  async getComments(taskId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.taskComment.findMany({
        where: { taskId, deletedAt: null },
        include: {
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.taskComment.count({ where: { taskId, deletedAt: null } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getStatusHistories(taskId: string) {
    return this.prisma.taskStatusHistory.findMany({
      where: { taskId },
      include: {
        changedBy: { select: { id: true, username: true, fullName: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMilestone(userId: string, projectId: string, createMilestoneDto: CreateMilestoneDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const milestone = await this.prisma.milestone.create({
      data: {
        ...createMilestoneDto,
        projectId,
        targetDate: new Date(createMilestoneDto.targetDate),
      },
    });

    await this.operationLogService.log(
      userId,
      OperationType.CREATE,
      'Milestone',
      milestone.id,
      `创建了里程碑: ${milestone.name}`,
      createMilestoneDto,
      projectId,
    );

    return milestone;
  }

  async checkAndSendMilestoneReminders(projectId?: string) {
    const now = dayjs();
    const today = now.startOf('day');

    const where: any = {
      deletedAt: null,
      achievedAt: null,
      targetDate: { gte: today.toDate() },
    };
    if (projectId) {
      where.projectId = projectId;
    }

    const milestones = await this.prisma.milestone.findMany({
      where,
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          where: { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } },
          select: { id: true },
        },
      },
    });

    const milestoneProjects = await this.prisma.project.findMany({
      where: { id: { in: milestones.map((m) => m.projectId) } },
      select: { id: true, name: true },
    });

    const projectMap = new Map(milestoneProjects.map((p) => [p.id, p.name]));

    const results: Array<{
      milestoneId: string; milestoneName: string; projectName: string; remindDay: number; daysUntil: number; sent: boolean; sentTo: string[] }> = [];

    for (const milestone of milestones) {
      if (!milestone.remindDays || milestone.remindDays.length === 0) continue;

      const daysUntil = dayjs(milestone.targetDate).diff(today, 'day');

      for (const remindDay of milestone.remindDays) {
        if (daysUntil === remindDay) {
          const existingReminder = await this.prisma.milestoneReminder.findUnique({
            where: { milestoneId_remindDay: { milestoneId: milestone.id, remindDay } },
          });

          if (!existingReminder) {
            const members = await this.prisma.projectMember.findMany({
              where: { projectId: milestone.projectId },
              select: { userId: true },
            });
            const memberIds = members.map((m) => m.userId);

            await this.prisma.$transaction(async (tx) => {
              await this.messageService.createMany(
                memberIds,
                MessageType.MILESTONE_REMINDER,
                `里程碑提醒: ${milestone.name}`,
                `里程碑「${milestone.name}」将于 ${remindDay} 天后到期，目标日期: ${dayjs(milestone.targetDate).format('YYYY-MM-DD')}，所属项目: ${projectMap.get(milestone.projectId) || '未知项目'}，还有 ${milestone.tasks.length} 个待办任务`,
                undefined,
                milestone.id,
                'Milestone',
              );

              await tx.milestoneReminder.create({
                data: {
                milestoneId: milestone.id,
                projectId: milestone.projectId,
                remindDay,
                sentTo: memberIds,
              },
            });
          });

            results.push({
              milestoneId: milestone.id,
              milestoneName: milestone.name,
              projectName: projectMap.get(milestone.projectId) || '未知项目',
              remindDay,
              daysUntil,
              sent: true,
              sentTo: memberIds,
            });
          } else {
            results.push({
              milestoneId: milestone.id,
              milestoneName: milestone.name,
              projectName: projectMap.get(milestone.projectId) || '未知项目',
              remindDay,
              daysUntil,
              sent: false,
              sentTo: existingReminder.sentTo,
            });
          }
        }
      }
    }

    return results;
  }

  async getMilestones(projectId: string) {
    return this.prisma.milestone.findMany({
      where: { projectId, deletedAt: null },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { targetDate: 'asc' },
    });
  }

  async getUpcomingMilestoneReminders(projectId: string, userId?: string) {
    const now = dayjs();
    const today = now.startOf('day');

    await this.checkAndSendMilestoneReminders(projectId);

    const where: any = {
      projectId,
      deletedAt: null,
      achievedAt: null,
    };

    if (userId) {
      where.reminders = {
        some: {
          sentTo: { has: userId },
        },
      };
    }

    const milestones = await this.prisma.milestone.findMany({
      where,
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          where: { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } },
          select: { id: true, title: true, status: true },
        },
        reminders: {
          orderBy: { remindDay: 'asc' },
        },
      },
      orderBy: { targetDate: 'asc' },
    });

    return milestones
      .filter((m) => {
        const daysUntil = dayjs(m.targetDate).diff(today, 'day');
        return m.remindDays?.some((rd) => rd >= daysUntil) && daysUntil >= 0;
      })
      .map((m) => {
        const daysUntil = dayjs(m.targetDate).diff(today, 'day');
        const totalTasks = m._count.tasks;
        const completedTasks = totalTasks - m.tasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const nextRemindDay = m.remindDays?.find((rd) => rd >= daysUntil);

        return {
          id: m.id,
          name: m.name,
          description: m.description,
          targetDate: m.targetDate,
          daysUntil,
          remindDays: m.remindDays,
          nextRemindDay,
          progress,
          totalTasks,
          completedTasks,
          pendingTasks: m.tasks.length,
          isUrgent: daysUntil <= 3,
          isToday: daysUntil === 0,
          reminders: m.reminders.map((r) => ({
            remindDay: r.remindDay,
            sentAt: r.sentAt,
            sentTo: r.sentTo,
          })),
        };
      });
  }

  async updateMilestone(userId: string, projectId: string, id: string, updateMilestoneDto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id, projectId, deletedAt: null },
    });

    if (!milestone) {
      throw new NotFoundException('里程碑不存在');
    }

    const updated = await this.prisma.milestone.update({
      where: { id },
      data: {
        ...updateMilestoneDto,
        targetDate: updateMilestoneDto.targetDate ? new Date(updateMilestoneDto.targetDate) : undefined,
      },
    });

    await this.operationLogService.log(
      userId,
      OperationType.UPDATE,
      'Milestone',
      id,
      `更新了里程碑: ${updated.name}`,
      updateMilestoneDto,
      projectId,
    );

    return updated;
  }

  async deleteMilestone(userId: string, projectId: string, id: string) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id, projectId, deletedAt: null },
    });

    if (!milestone) {
      throw new NotFoundException('里程碑不存在');
    }

    const taskCount = await this.prisma.task.count({
      where: { milestoneId: id, deletedAt: null },
    });

    if (taskCount > 0) {
      throw new ForbiddenException('该里程碑下还有任务，无法删除');
    }

    await this.prisma.milestone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.operationLogService.log(
      userId,
      OperationType.DELETE,
      'Milestone',
      id,
      `删除了里程碑: ${milestone.name}`,
      null,
      projectId,
    );

    return { message: '里程碑已删除' };
  }
}
