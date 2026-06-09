import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async create(
    receiverId: string,
    type: MessageType,
    title: string,
    content?: string,
    senderId?: string,
    relatedId?: string,
    relatedType?: string,
  ) {
    return this.prisma.message.create({
      data: {
        receiverId,
        senderId,
        type,
        title,
        content,
        relatedId,
        relatedType,
      },
    });
  }

  async createMany(
    receiverIds: string[],
    type: MessageType,
    title: string,
    content?: string,
    senderId?: string,
    relatedId?: string,
    relatedType?: string,
  ) {
    return this.prisma.message.createMany({
      data: receiverIds.map((receiverId) => ({
        receiverId,
        senderId,
        type,
        title,
        content,
        relatedId,
        relatedType,
      })),
    });
  }

  async findByUser(userId: string, page = 1, pageSize = 20, isRead?: boolean) {
    const skip = (page - 1) * pageSize;
    const where: any = { receiverId: userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          sender: { select: { id: true, username: true, fullName: true, avatar: true } },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.message.count({
      where: { receiverId: userId, isRead: false },
    });
  }

  async markAsRead(userId: string, messageId: string) {
    return this.prisma.message.updateMany({
      where: { id: messageId, receiverId: userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.message.updateMany({
      where: { receiverId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(userId: string, messageId: string) {
    return this.prisma.message.deleteMany({
      where: { id: messageId, receiverId: userId },
    });
  }
}
