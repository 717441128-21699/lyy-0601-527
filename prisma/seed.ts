import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = {
  project: {
    view: true,
    edit: false,
    delete: false,
    manageMembers: false,
    manageRoles: false,
  },
  task: {
    view: true,
    create: true,
    edit: true,
    delete: false,
    assign: true,
    changeStatus: true,
    comment: true,
  },
  schedule: {
    view: true,
    create: true,
    edit: true,
    delete: true,
  },
  file: {
    view: true,
    upload: true,
    download: true,
    delete: false,
  },
  stats: {
    view: true,
    export: false,
  },
};

const ROLE_PERMISSIONS: Record<string, Partial<typeof DEFAULT_PERMISSIONS>> = {
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

async function main() {
  console.log('Start seeding...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: hashedPassword,
      fullName: '系统管理员',
      status: UserStatus.ACTIVE,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      username: 'demo',
      passwordHash: hashedPassword,
      fullName: '演示用户',
      status: UserStatus.ACTIVE,
    },
  });

  const demoUser2 = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      username: 'user',
      passwordHash: hashedPassword,
      fullName: '普通用户',
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Users created:', { admin: admin.id, demo: demoUser.id, user: demoUser2.id });

  const project = await prisma.project.create({
    data: {
      name: '产品研发项目',
      description: '团队协作平台产品研发项目',
      key: 'TCP',
      status: 'ACTIVE',
      color: '#3B82F6',
      icon: 'rocket',
      ownerId: admin.id,
      members: {
        create: [
          { userId: demoUser.id, invitedBy: admin.id },
          { userId: demoUser2.id, invitedBy: admin.id },
        ],
      },
      roles: {
        create: [
          { name: 'OWNER', isSystem: true, permissions: ROLE_PERMISSIONS.OWNER, description: '项目所有者' },
          { name: 'ADMIN', isSystem: true, permissions: ROLE_PERMISSIONS.ADMIN, description: '项目管理员' },
          { name: 'MEMBER', isSystem: true, permissions: ROLE_PERMISSIONS.MEMBER, description: '普通成员' },
          { name: 'VIEWER', isSystem: true, permissions: ROLE_PERMISSIONS.VIEWER, description: '查看者' },
          { name: 'GUEST', isSystem: true, permissions: ROLE_PERMISSIONS.GUEST, description: '访客' },
        ],
      },
    },
    include: { roles: true, members: true },
  });

  const ownerRole = project.roles.find((r) => r.name === 'OWNER');
  const adminRole = project.roles.find((r) => r.name === 'ADMIN');
  const memberRole = project.roles.find((r) => r.name === 'MEMBER');

  await prisma.projectMember.update({
    where: { id: project.members[0].id },
    data: { roleId: memberRole?.id },
  });

  await prisma.projectMember.update({
    where: { id: project.members[1].id },
    data: { roleId: adminRole?.id },
  });

  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: admin.id,
      roleId: ownerRole?.id,
      invitedBy: admin.id,
    },
  });

  console.log('Project created:', project.id);

  const milestone1 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: '需求分析完成',
      description: '完成所有需求分析和评审',
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const milestone2 = await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: '系统架构设计',
      description: '完成系统架构设计和技术选型',
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Milestones created:', { m1: milestone1.id, m2: milestone2.id });

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        projectId: project.id,
        title: '需求调研与分析',
        description: '与客户沟通，整理需求文档',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        creatorId: admin.id,
        assigneeId: demoUser.id,
        milestoneId: milestone1.id,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estimatedHours: 16,
        tags: ['需求', '调研'],
      },
    }),
    prisma.task.create({
      data: {
        projectId: project.id,
        title: '编写需求规格说明书',
        description: '根据需求调研结果，编写详细的需求规格说明书',
        priority: 'HIGH',
        status: 'TODO',
        creatorId: admin.id,
        assigneeId: demoUser.id,
        milestoneId: milestone1.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estimatedHours: 24,
        tags: ['需求', '文档'],
      },
    }),
    prisma.task.create({
      data: {
        projectId: project.id,
        title: '技术选型评估',
        description: '评估前后端技术栈，确定架构方案',
        priority: 'URGENT',
        status: 'TODO',
        creatorId: admin.id,
        assigneeId: demoUser2.id,
        milestoneId: milestone2.id,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        estimatedHours: 12,
        tags: ['架构', '技术'],
      },
    }),
    prisma.task.create({
      data: {
        projectId: project.id,
        title: '数据库设计',
        description: '设计数据库表结构和关系',
        priority: 'MEDIUM',
        status: 'TODO',
        creatorId: admin.id,
        assigneeId: demoUser2.id,
        milestoneId: milestone2.id,
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        estimatedHours: 16,
        tags: ['数据库', '设计'],
      },
    }),
  ]);

  const subtask1 = await prisma.task.create({
    data: {
      projectId: project.id,
      parentId: tasks[0].id,
      title: '用户访谈',
      description: '与核心用户进行访谈，收集需求',
      priority: 'HIGH',
      status: 'DONE',
      creatorId: admin.id,
      assigneeId: demoUser.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      estimatedHours: 8,
      actualHours: 6,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      tags: ['访谈'],
    },
  });

  const subtask2 = await prisma.task.create({
    data: {
      projectId: project.id,
      parentId: tasks[0].id,
      title: '竞品分析',
      description: '分析市场上同类产品的功能特点',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      creatorId: admin.id,
      assigneeId: demoUser.id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      estimatedHours: 4,
      tags: ['分析'],
    },
  });

  console.log('Tasks created:', tasks.length, 'subtasks:', 2);

  await prisma.taskStatusHistory.create({
    data: {
      taskId: tasks[0].id,
      oldStatus: 'TODO',
      newStatus: 'IN_PROGRESS',
      changedById: admin.id,
      remark: '开始进行需求调研',
    },
  });

  await prisma.taskStatusHistory.create({
    data: {
      taskId: subtask1.id,
      oldStatus: 'TODO',
      newStatus: 'IN_PROGRESS',
      changedById: demoUser.id,
      remark: '开始用户访谈',
    },
  });

  await prisma.taskStatusHistory.create({
    data: {
      taskId: subtask1.id,
      oldStatus: 'IN_PROGRESS',
      newStatus: 'DONE',
      changedById: demoUser.id,
      remark: '已完成所有用户访谈',
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: tasks[0].id,
      userId: admin.id,
      content: '请重点关注用户体验相关的需求',
    },
  });

  await prisma.taskComment.create({
    data: {
      taskId: tasks[0].id,
      userId: demoUser.id,
      content: '好的，我会整理一份详细的访谈记录',
    },
  });

  console.log('Comments and histories created');

  await Promise.all([
    prisma.schedule.create({
      data: {
        projectId: project.id,
        userId: admin.id,
        title: '需求评审会议',
        description: '评审需求规格说明书',
        type: 'MEETING',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
        location: '会议室A',
        attendees: [admin.id, demoUser.id, demoUser2.id],
        remindMinutes: [60, 30, 15],
      },
    }),
    prisma.schedule.create({
      data: {
        projectId: project.id,
        userId: demoUser.id,
        title: '编写需求文档',
        type: 'TASK_DEADLINE',
        startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000),
        isAllDay: true,
        remindMinutes: [1440, 60],
      },
    }),
  ]);

  console.log('Schedules created');

  await prisma.file.create({
    data: {
      projectId: project.id,
      userId: admin.id,
      name: '需求调研模板.docx',
      originalName: '需求调研模板.docx',
      path: '/uploads/docs/需求调研模板.docx',
      size: BigInt(102400),
      type: 'DOCUMENT',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      keywords: ['需求', '模板', '调研'],
      description: '需求调研标准模板',
    },
  });

  await prisma.file.create({
    data: {
      projectId: project.id,
      taskId: tasks[0].id,
      userId: demoUser.id,
      name: '访谈记录-用户A.pdf',
      originalName: '访谈记录-用户A.pdf',
      path: '/uploads/docs/访谈记录-用户A.pdf',
      size: BigInt(204800),
      type: 'DOCUMENT',
      mimeType: 'application/pdf',
      keywords: ['访谈', '记录', '用户'],
      description: '用户A访谈记录',
    },
  });

  console.log('Files created');

  await Promise.all([
    prisma.message.create({
      data: {
        receiverId: demoUser.id,
        senderId: admin.id,
        type: 'TASK_ASSIGNED',
        title: '新任务分配',
        content: '您被分配了新任务：需求调研与分析',
        relatedId: tasks[0].id,
        relatedType: 'Task',
      },
    }),
    prisma.message.create({
      data: {
        receiverId: demoUser2.id,
        senderId: admin.id,
        type: 'TASK_ASSIGNED',
        title: '新任务分配',
        content: '您被分配了新任务：技术选型评估',
        relatedId: tasks[2].id,
        relatedType: 'Task',
      },
    }),
    prisma.message.create({
      data: {
        receiverId: demoUser.id,
        senderId: null,
        type: 'MILESTONE_REMINDER',
        title: '里程碑提醒',
        content: '里程碑 "需求分析完成" 将在7天后到期',
        relatedId: milestone1.id,
        relatedType: 'Milestone',
      },
    }),
  ]);

  console.log('Messages created');

  console.log('Seeding completed!');
  console.log('Test accounts:');
  console.log('  admin@example.com / 123456');
  console.log('  demo@example.com / 123456');
  console.log('  user@example.com / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
