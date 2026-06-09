import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('统计看板')
@Controller()
@ApiBearerAuth()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats/me')
  @ApiOperation({ summary: '获取个人统计数据' })
  async getUserStats(@CurrentUser() user: { id: string }) {
    return this.statsService.getUserStats(user.id);
  }

  @Get('stats/me/todos')
  @ApiOperation({ summary: '获取我的待办任务' })
  async getMyTodos(
    @CurrentUser() user: { id: string },
    @Query() paginationDto: PaginationDto,
  ) {
    return this.statsService.getMyTodos(user.id, paginationDto.page, paginationDto.pageSize);
  }

  @Get('projects/:projectId/stats')
  @ApiOperation({ summary: '获取项目统计数据' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'stats', action: 'view' })
  async getProjectStats(@Param('projectId') projectId: string) {
    return this.statsService.getProjectStats(projectId);
  }

  @Get('projects/:projectId/stats/operation-logs')
  @ApiOperation({ summary: '获取项目操作日志' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'stats', action: 'view' })
  async getOperationLogs(
    @Param('projectId') projectId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.statsService.getOperationLogs(projectId, paginationDto.page, paginationDto.pageSize);
  }

  @Get('projects/:projectId/stats/task-distribution')
  @ApiOperation({ summary: '获取任务状态分布' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'stats', action: 'view' })
  async getTaskStatusDistribution(@Param('projectId') projectId: string) {
    return this.statsService.getTaskStatusDistribution(projectId);
  }

  @Get('projects/:projectId/stats/task-trend')
  @ApiOperation({ summary: '获取任务创建/完成趋势' })
  @ApiQuery({ name: 'days', required: false, description: '统计天数', example: 30 })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'stats', action: 'view' })
  async getTaskTrend(
    @Param('projectId') projectId: string,
    @Query('days') days?: number,
  ) {
    return this.statsService.getTaskTrend(projectId, days || 30);
  }

  @Get('projects/:projectId/stats/member-performance')
  @ApiOperation({ summary: '获取成员绩效统计' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'stats', action: 'view' })
  async getMemberPerformance(@Param('projectId') projectId: string) {
    return this.statsService.getMemberPerformance(projectId);
  }
}
