import { Controller, Get, Query, Put, Param, Delete, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('消息提醒')
@Controller('messages')
@ApiBearerAuth()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @ApiOperation({ summary: '获取我的消息列表' })
  @ApiQuery({ name: 'isRead', required: false, description: '是否已读' })
  async getMessages(
    @CurrentUser() user: { id: string },
    @Query() paginationDto: PaginationDto,
    @Query('isRead') isRead?: string,
  ) {
    return this.messageService.findByUser(
      user.id,
      paginationDto.page,
      paginationDto.pageSize,
      isRead !== undefined ? isRead === 'true' : undefined,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: '获取未读消息数量' })
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    const count = await this.messageService.getUnreadCount(user.id);
    return { count };
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '标记消息为已读' })
  async markAsRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.messageService.markAsRead(user.id, id);
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '标记所有消息为已读' })
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    await this.messageService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除消息' })
  async deleteMessage(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    await this.messageService.delete(user.id, id);
  }
}
