import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskStatus, TaskPriority } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getProjectStats(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const [tasks, members, milestones] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId, deletedAt: null },
        select: { status: true, priority: true, dueDate: true, completedAt: true, actualHours: true, estimatedHours: true, createdAt: true },
      }),
      this.prisma.projectMember.count({ where: { projectId } }),
      this.prisma.milestone.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true, name: true, targetDate: true, achievedAt: true, tasks: { select: { status: true } } },
      }),
    ]);

    const taskStatusStats = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const taskPriorityStats = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
    const overdueTasks = tasks.filter(
      (t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED && t.dueDate && new Date(t.dueDate) < new Date(),
    );

    const now = new Date();
    const startOfWeek = dayjs().startOf('week').toDate();
    const endOfWeek = dayjs().endOf('week').toDate();

    const thisWeekCompleted = completedTasks.filter(
      (t) => t.completedAt && t.completedAt >= startOfWeek && t.completedAt <= endOfWeek,
    ).length;

    const thisWeekCreated = tasks.filter(
      (t) => t.createdAt >= startOfWeek && t.createdAt <= endOfWeek,
    ).length;

    const milestoneStats = milestones.map((m) => {
      const totalTasks = m.tasks.length;
      const completedTasks = m.tasks.filter((t) => t.status === TaskStatus.DONE).length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const isOverdue = !m.achievedAt && new Date(m.targetDate) < now;

      return {
        id: m.id,
        name: m.name,
        targetDate: m.targetDate,
        achievedAt: m.achievedAt,
        totalTasks,
        completedTasks,
        progress,
        isOverdue,
      };
    });

    return {
      overview: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
        todoTasks: tasks.filter((t) => t.status === TaskStatus.TODO).length,
        overdueTasks: overdueTasks.length,
        totalMembers: members,
        totalMilestones: milestones.length,
        completedMilestones: milestones.filter((m) => m.achievedAt).length,
        progress: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      },
      taskStatusStats,
      taskPriorityStats,
      timeStats: {
        totalEstimatedHours,
        totalActualHours,
        hoursProgress: totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0,
      },
      weeklyStats: {
        thisWeekCompleted,
        thisWeekCreated,
      },
      milestones: milestoneStats,
    };
  }

  async getUserStats(userId: string) {
    const [assignedTasks, createdTasks, projects, messages] = await Promise.all([
      this.prisma.task.findMany({
        where: { assigneeId: userId, deletedAt: null },
        select: { id: true, status: true, priority: true, dueDate: true, projectId: true, project: { select: { name: true, color: true } } },
      }),
      this.prisma.task.count({ where: { creatorId: userId, deletedAt: null } }),
      this.prisma.projectMember.findMany({
        where: { userId },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              key: true,
              color: true,
              _count: { select: { tasks: true, members: true } },
            },
          },
          role: { select: { id: true, name: true } },
        },
      }),
      this.prisma.message.count({ where: { receiverId: userId, isRead: false } }),
    ]);

    const taskStatusStats = assignedTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const taskPriorityStats = assignedTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const now = new Date();
    const myTodos = assignedTasks.filter(
      (t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED,
    );
    const myOverdue = myTodos.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now,
    );
    const myUrgent = myTodos.filter(
      (t) => t.priority === TaskPriority.URGENT,
    );

    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();
    const nextWeek = dayjs().add(7, 'day').startOf('day').toDate();

    const tasksDueToday = myTodos.filter(
      (t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow,
    );
    const tasksDueThisWeek = myTodos.filter(
      (t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < nextWeek,
    );

    const projectStats = projects.map((p) => {
      const projectTasks = assignedTasks.filter((t) => t.projectId === p.projectId);
      const completed = projectTasks.filter((t) => t.status === TaskStatus.DONE).length;
      return {
        projectId: p.projectId,
        projectName: p.project.name,
        projectKey: p.project.key,
        projectColor: p.project.color,
        role: p.role?.name,
        totalTasks: projectTasks.length,
        completedTasks: completed,
        progress: projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0,
      };
    });

    return {
      overview: {
        totalAssignedTasks: assignedTasks.length,
        totalCreatedTasks: createdTasks,
        totalProjects: projects.length,
        unreadMessages: messages,
        myTodos: myTodos.length,
        myOverdue: myOverdue.length,
        myUrgent: myUrgent.length,
      },
      taskStatusStats,
      taskPriorityStats,
      upcoming: {
        dueToday: tasksDueToday.length,
        dueThisWeek: tasksDueThisWeek.length,
      },
      projectStats,
    };
  }

  async getMyTodos(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const where: any = {
      assigneeId: userId,
      deletedAt: null,
      status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
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

  async getOperationLogs(projectId: string, page = 1, pageSize = 20) {
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

  async getTaskStatusDistribution(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null, parentId: null },
      select: { status: true },
    });

    const distribution = Object.values(TaskStatus).map((status) => ({
      status,
      count: tasks.filter((t) => t.status === status).length,
    }));

    return distribution;
  }

  async getTaskTrend(projectId: string, days = 30) {
    const endDate = new Date();
    const startDate = dayjs().subtract(days, 'day').toDate();

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, completedAt: true },
    });

    const trendData: Array<{ date: string; created: number; completed: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = dayjs().subtract(i, 'day').startOf('day');
      const nextDate = date.add(1, 'day');

      const created = tasks.filter(
        (t) => t.createdAt >= date.toDate() && t.createdAt < nextDate.toDate(),
      ).length;

      const completed = tasks.filter(
        (t) =>
          t.completedAt &&
          t.completedAt >= date.toDate() &&
          t.completedAt < nextDate.toDate(),
      ).length;

      trendData.unshift({
        date: date.format('YYYY-MM-DD'),
        created,
        completed,
      });
    }

    return trendData;
  }

  async getMemberPerformance(projectId: string) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
      },
    });

    const performance = await Promise.all(
      members.map(async (member) => {
        const tasks = await this.prisma.task.findMany({
          where: { projectId, assigneeId: member.userId, deletedAt: null },
          select: { status: true, actualHours: true, estimatedHours: true },
        });

        const total = tasks.length;
        const completed = tasks.filter((t) => t.status === TaskStatus.DONE).length;
        const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
        const totalActual = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

        return {
          userId: member.userId,
          username: member.user.username,
          fullName: member.user.fullName,
          avatar: member.user.avatar,
          totalTasks: total,
          completedTasks: completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          totalEstimatedHours: totalEstimated,
          totalActualHours: totalActual,
          efficiency: totalEstimated > 0 ? Math.round((totalEstimated / totalActual) * 100) : 0,
        };
      }),
    );

    return performance.sort((a, b) => b.completionRate - a.completionRate);
  }
}
