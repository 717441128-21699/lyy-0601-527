import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TaskService } from './task.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  ChangeTaskStatusDto,
  CreateTaskCommentDto,
  QueryTaskDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
} from './dto/task.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('任务流转')
@Controller('projects/:projectId/tasks')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('milestones/check-reminders')
  @ApiOperation({ summary: '检查并发送里程碑到期提醒' })
  @RequirePermission({ module: 'task', action: 'view' })
  async checkMilestoneReminders(@Param('projectId') projectId: string) {
    const results = await this.taskService.checkAndSendMilestoneReminders(projectId);
    return {
      message: '提醒检查完成',
      totalMilestones: results.length,
      newlySent: results.filter((r) => r.sent).length,
      details: results,
    };
  }

  @Get('my-todos')
  @ApiOperation({ summary: '获取我的待办任务(跨项目)' })
  async getMyTodos(
    @CurrentUser() user: { id: string },
    @Query() paginationDto: PaginationDto,
  ) {
    return this.taskService.findMyTodos(user.id, paginationDto.page, paginationDto.pageSize);
  }

  @Get('milestones')
  @ApiOperation({ summary: '获取项目里程碑列表' })
  @RequirePermission({ module: 'task', action: 'view' })
  async getMilestones(@Param('projectId') projectId: string) {
    return this.taskService.getMilestones(projectId);
  }

  @Post('milestones')
  @ApiOperation({ summary: '创建里程碑' })
  @RequirePermission({ module: 'task', action: 'create' })
  async createMilestone(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.taskService.createMilestone(user.id, projectId, createMilestoneDto);
  }

  @Get('milestones/upcoming-reminders')
  @ApiOperation({ summary: '获取即将到期的里程碑提醒' })
  @RequirePermission({ module: 'task', action: 'view' })
  async getUpcomingMilestoneReminders(@Param('projectId') projectId: string) {
    return this.taskService.getUpcomingMilestoneReminders(projectId);
  }

  @Patch('milestones/:id')
  @ApiOperation({ summary: '更新里程碑' })
  @RequirePermission({ module: 'task', action: 'edit' })
  async updateMilestone(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.taskService.updateMilestone(user.id, projectId, id, updateMilestoneDto);
  }

  @Delete('milestones/:id')
  @ApiOperation({ summary: '删除里程碑' })
  @RequirePermission({ module: 'task', action: 'delete' })
  async deleteMilestone(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.taskService.deleteMilestone(user.id, projectId, id);
  }

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @RequirePermission({ module: 'task', action: 'create' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.taskService.create(user.id, projectId, createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: '获取项目任务列表' })
  @RequirePermission({ module: 'task', action: 'view' })
  async findAll(@Param('projectId') projectId: string, @Query() query: QueryTaskDto) {
    return this.taskService.findAll(projectId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取任务详情' })
  @RequirePermission({ module: 'task', action: 'view' })
  async findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务' })
  @RequirePermission({ module: 'task', action: 'edit' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(user.id, id, updateTaskDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '变更任务状态' })
  @RequirePermission({ module: 'task', action: 'changeStatus' })
  async changeStatus(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeTaskStatusDto,
  ) {
    return this.taskService.changeStatus(user.id, id, changeStatusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  @RequirePermission({ module: 'task', action: 'delete' })
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.taskService.remove(user.id, id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: '获取任务评论列表' })
  @RequirePermission({ module: 'task', action: 'view' })
  async getComments(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.taskService.getComments(id, paginationDto.page, paginationDto.pageSize);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: '添加任务评论' })
  @RequirePermission({ module: 'task', action: 'comment' })
  async addComment(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() createCommentDto: CreateTaskCommentDto,
  ) {
    return this.taskService.addComment(user.id, id, createCommentDto);
  }

  @Get(':id/histories')
  @ApiOperation({ summary: '获取任务状态变更历史' })
  @RequirePermission({ module: 'task', action: 'view' })
  async getStatusHistories(@Param('id') id: string) {
    return this.taskService.getStatusHistories(id);
  }
}
