import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageService } from '../message/message.service';
import { OperationLogService } from '../operation-log/operation-log.service';
import { UploadFileDto, UpdateFileDto, QueryFileDto } from './dto/file.dto';
import { OperationType } from '@prisma/client';

@Injectable()
export class FileService {
  constructor(
    private prisma: PrismaService,
    private messageService: MessageService,
    private operationLogService: OperationLogService,
  ) {}

  async create(userId: string, projectId: string, uploadFileDto: UploadFileDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (uploadFileDto.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: uploadFileDto.taskId, projectId, deletedAt: null },
      });
      if (!task) {
        throw new NotFoundException('任务不存在');
      }
    }

    const file = await this.prisma.file.create({
      data: {
        ...uploadFileDto,
        size: BigInt(uploadFileDto.size),
        projectId,
        userId,
      },
    });

    if (uploadFileDto.taskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: uploadFileDto.taskId },
        select: { title: true, assigneeId: true },
      });

      if (task?.assigneeId && task.assigneeId !== userId) {
        await this.messageService.create(
          task.assigneeId,
          'FILE_UPLOADED',
          `任务有新附件`,
          `任务 "${task.title}" 有新附件上传: ${file.name}`,
          userId,
          file.id,
          'File',
        );
      }
    }

    await this.operationLogService.log(
      userId,
      OperationType.UPLOAD,
      'File',
      file.id,
      `上传了文件: ${file.name}`,
      { name: file.name, size: uploadFileDto.size, type: uploadFileDto.type },
      projectId,
    );

    return this.findOne(file.id);
  }

  async findAll(projectId: string, query: QueryFileDto) {
    const { page = 1, pageSize = 20, type, keyword, userId, taskId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      projectId,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    if (userId) {
      where.userId = userId;
    }

    if (taskId) {
      where.taskId = taskId;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { originalName: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { keywords: { has: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true, avatar: true } },
          task: { select: { id: true, title: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        size: Number(item.size),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
        project: { select: { id: true, name: true, key: true } },
        task: { select: { id: true, title: true } },
      },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    return {
      ...file,
      size: Number(file.size),
    };
  }

  async update(userId: string, id: string, updateFileDto: UpdateFileDto) {
    const file = await this.prisma.file.findUnique({
      where: { id, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('只有上传者可以修改文件信息');
    }

    if (updateFileDto.taskId && file.projectId) {
      const task = await this.prisma.task.findUnique({
        where: { id: updateFileDto.taskId, projectId: file.projectId, deletedAt: null },
      });
      if (!task) {
        throw new NotFoundException('任务不存在');
      }
    }

    const updated = await this.prisma.file.update({
      where: { id },
      data: updateFileDto,
    });

    await this.operationLogService.log(
      userId,
      OperationType.UPDATE,
      'File',
      id,
      `更新了文件信息: ${updated.name}`,
      updateFileDto,
      file.projectId,
    );

    return this.findOne(id);
  }

  async remove(userId: string, id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id, deletedAt: null },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    if (file.userId !== userId) {
      throw new ForbiddenException('只有上传者可以删除文件');
    }

    await this.prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.operationLogService.log(
      userId,
      OperationType.DELETE,
      'File',
      id,
      `删除了文件: ${file.name}`,
      null,
      file.projectId,
    );

    return { message: '文件已删除' };
  }

  async search(projectId: string | undefined, keyword: string) {
    const where: any = {
      deletedAt: null,
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { originalName: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { keywords: { has: keyword } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const files = await this.prisma.file.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullName: true, avatar: true } },
        project: { select: { id: true, name: true, key: true, color: true } },
        task: { select: { id: true, title: true } },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => ({
      ...file,
      size: Number(file.size),
    }));
  }
}
