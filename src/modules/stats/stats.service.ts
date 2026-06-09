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

  async getProjectHealth(projectId: string) {
    const now = dayjs();
    const today = now.startOf('day');
    const sevenDaysLater = now.add(7, 'day').toDate();
    const fourteenDaysAgo = now.subtract(14, 'day').toDate();

    const [tasks, milestones, members] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId, deletedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          assigneeId: true,
          assignee: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
      }),
      this.prisma.milestone.findMany({
        where: { projectId, deletedAt: null, achievedAt: null },
        include: {
          _count: { select: { tasks: true } },
          tasks: {
            where: { status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] } },
            select: { id: true },
          },
        },
      }),
      this.prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
          role: { select: { id: true, name: true } },
        },
      }),
    ]);

    const overdueTasks = tasks.filter(
      (t) =>
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED &&
        t.dueDate &&
        dayjs(t.dueDate).isBefore(today),
    );

    const dueTodayTasks = tasks.filter(
      (t) =>
        t.status !== TaskStatus.DONE &&
        t.status !== TaskStatus.CANCELLED &&
        t.dueDate &&
        dayjs(t.dueDate).isSame(today, 'day'),
    );

    const upcomingMilestones = milestones
      .filter((m) => dayjs(m.targetDate).isAfter(today) && dayjs(m.targetDate).isBefore(sevenDaysLater))
      .map((m) => {
        const daysUntil = dayjs(m.targetDate).diff(today, 'day');
        const totalTasks = m._count.tasks;
        const completedTasks = totalTasks - m.tasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          id: m.id,
          name: m.name,
          targetDate: m.targetDate,
          daysUntil,
          progress,
          pendingTasks: m.tasks.length,
          totalTasks,
          isUrgent: daysUntil <= 3,
        };
      });

    const memberWorkload = members.map((member) => {
      const memberTasks = tasks.filter((t) => t.assigneeId === member.userId);
      const pendingTasks = memberTasks.filter(
        (t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED,
      );
      const overdueMemberTasks = pendingTasks.filter(
        (t) => t.dueDate && dayjs(t.dueDate).isBefore(today),
      );
      const highPriorityTasks = pendingTasks.filter(
        (t) => t.priority === TaskPriority.URGENT || t.priority === TaskPriority.HIGH,
      );

      let workloadLevel = 'normal';
      if (pendingTasks.length > 10 || overdueMemberTasks.length > 3) {
        workloadLevel = 'overloaded';
      } else if (pendingTasks.length === 0) {
        workloadLevel = 'idle';
      }

      return {
        userId: member.userId,
        username: member.user.username,
        fullName: member.user.fullName,
        avatar: member.user.avatar,
        role: member.role?.name,
        totalTasks: memberTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueMemberTasks.length,
        highPriorityTasks: highPriorityTasks.length,
        workloadLevel,
      };
    });

    const completionTrend: Array<{ date: string; completed: number; created: number }> = [];
    for (let i = 0; i < 14; i++) {
      const date = today.subtract(i, 'day');
      const nextDate = date.add(1, 'day');

      const completed = tasks.filter(
        (t) =>
          t.status === TaskStatus.DONE &&
          t.completedAt &&
          dayjs(t.completedAt).isAfter(date.toDate()) &&
          dayjs(t.completedAt).isBefore(nextDate.toDate()),
      ).length;

      const created = tasks.filter(
        (t) =>
          (t as any).createdAt &&
          dayjs((t as any).createdAt).isAfter(date.toDate()) &&
          dayjs((t as any).createdAt).isBefore(nextDate.toDate()),
      ).length;

      completionTrend.unshift({
        date: date.format('MM-DD'),
        completed,
        created,
      });
    }

    const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const totalTasks = tasks.filter((t) => t.status !== TaskStatus.CANCELLED).length;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let healthScore = 100;
    let riskLevel = 'healthy';
    const risks: string[] = [];

    if (overdueTasks.length > 5) {
      healthScore -= 30;
      risks.push(`有 ${overdueTasks.length} 个任务已逾期`);
    } else if (overdueTasks.length > 0) {
      healthScore -= overdueTasks.length * 5;
      risks.push(`有 ${overdueTasks.length} 个任务已逾期`);
    }

    const urgentMilestones = upcomingMilestones.filter((m) => m.isUrgent && m.progress < 80);
    if (urgentMilestones.length > 0) {
      healthScore -= urgentMilestones.length * 15;
      risks.push(`${urgentMilestones.length} 个里程碑即将到期且进度不足80%`);
    }

    const overloadedMembers = memberWorkload.filter((m) => m.workloadLevel === 'overloaded');
    if (overloadedMembers.length > 0) {
      healthScore -= overloadedMembers.length * 10;
      risks.push(`${overloadedMembers.length} 名成员负载过高`);
    }

    if (overallProgress < 50 && dayjs().diff(fourteenDaysAgo, 'day') > 7) {
      healthScore -= 20;
      risks.push('项目整体进度低于50%');
    }

    if (healthScore < 50) {
      riskLevel = 'critical';
    } else if (healthScore < 70) {
      riskLevel = 'warning';
    } else if (healthScore < 90) {
      riskLevel = 'attention';
    }

    return {
      healthScore: Math.max(0, healthScore),
      riskLevel,
      risks,
      overallProgress,
      overdueTasks: {
        count: overdueTasks.length,
        items: overdueTasks.slice(0, 10),
      },
      dueTodayTasks: {
        count: dueTodayTasks.length,
        items: dueTodayTasks.slice(0, 10),
      },
      upcomingMilestones: {
        count: upcomingMilestones.length,
        items: upcomingMilestones,
      },
      memberWorkload,
      completionTrend,
      summary: {
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        totalMembers: members.length,
        activeMilestones: milestones.length,
      },
    };
  }

  async getUnifiedTodos(userId: string) {
    const now = dayjs();
    const today = now.startOf('day');
    const endOfWeek = now.endOf('week');

    const [tasks, schedules, milestoneReminders] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          deletedAt: null,
          status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
        },
        include: {
          project: { select: { id: true, name: true, key: true, color: true } },
          milestone: { select: { id: true, name: true } },
          creator: { select: { id: true, username: true, fullName: true, avatar: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      }),
      this.prisma.schedule.findMany({
        where: {
          OR: [{ userId }, { attendees: { has: userId } }],
          startTime: { gte: today.toDate() },
          endTime: { lte: endOfWeek.toDate() },
        },
        include: {
          project: { select: { id: true, name: true, key: true, color: true } },
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.message.findMany({
        where: {
          receiverId: userId,
          type: 'MILESTONE_REMINDER',
          isRead: false,
          createdAt: { gte: today.subtract(7, 'day').toDate() },
        },
        include: {
          sender: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formatTask = (task: any) => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      project: task.project,
      milestone: task.milestone,
      creator: task.creator,
      subtaskCount: task._count.subtasks,
      commentCount: task._count.comments,
      createdAt: task.createdAt,
    });

    const formatSchedule = (schedule: any) => ({
      id: schedule.id,
      type: 'schedule' as const,
      title: schedule.title,
      description: schedule.description,
      typeDetail: schedule.type,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isAllDay: schedule.isAllDay,
      location: schedule.location,
      meetingLink: schedule.meetingLink,
      project: schedule.project,
      creator: schedule.user,
      attendees: schedule.attendees,
      createdAt: schedule.createdAt,
    });

    const formatMilestoneReminder = (reminder: any) => ({
      id: reminder.id,
      type: 'milestone_reminder' as const,
      title: reminder.title,
      content: reminder.content,
      relatedId: reminder.relatedId,
      sender: reminder.sender,
      createdAt: reminder.createdAt,
      isRead: reminder.isRead,
    });

    const overdue = {
      tasks: tasks
        .filter((t) => t.dueDate && dayjs(t.dueDate).isBefore(today))
        .map(formatTask),
      schedules: [] as any[],
      milestoneReminders: [] as any[],
      total: 0,
    };
    overdue.total = overdue.tasks.length;

    const todayItems = {
      tasks: tasks
        .filter((t) => t.dueDate && dayjs(t.dueDate).isSame(today, 'day'))
        .map(formatTask),
      schedules: schedules
        .filter((s) => dayjs(s.startTime).isSame(today, 'day'))
        .map(formatSchedule),
      milestoneReminders: milestoneReminders
        .filter((r) => dayjs(r.createdAt).isSame(today, 'day'))
        .map(formatMilestoneReminder),
      total: 0,
    };
    todayItems.total = todayItems.tasks.length + todayItems.schedules.length + todayItems.milestoneReminders.length;

    const thisWeek = {
      tasks: tasks
        .filter(
          (t) =>
            t.dueDate &&
            dayjs(t.dueDate).isAfter(today) &&
            dayjs(t.dueDate).isBefore(endOfWeek),
        )
        .map(formatTask),
      schedules: schedules
        .filter((s) => dayjs(s.startTime).isAfter(today) && dayjs(s.startTime).isBefore(endOfWeek))
        .map(formatSchedule),
      milestoneReminders: milestoneReminders
        .filter((r) => dayjs(r.createdAt).isAfter(today))
        .map(formatMilestoneReminder),
      total: 0,
    };
    thisWeek.total = thisWeek.tasks.length + thisWeek.schedules.length + thisWeek.milestoneReminders.length;

    const others = {
      tasks: tasks
        .filter((t) => !t.dueDate || dayjs(t.dueDate).isAfter(endOfWeek))
        .map(formatTask),
      total: 0,
    };
    others.total = others.tasks.length;

    return {
      overdue,
      today: todayItems,
      thisWeek,
      others,
      summary: {
        total: overdue.total + todayItems.total + thisWeek.total + others.total,
        tasks: tasks.length,
        schedules: schedules.length,
        milestoneReminders: milestoneReminders.length,
      },
    };
  }
}
