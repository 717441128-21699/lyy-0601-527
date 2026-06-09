import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  QueryScheduleDto,
  CheckAvailabilityDto,
} from './dto/schedule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('日程安排')
@Controller()
@ApiBearerAuth()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('schedules/my')
  @ApiOperation({ summary: '获取我的日程列表' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  async getMySchedules(
    @CurrentUser() user: { id: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.scheduleService.findMySchedules(user.id, startDate, endDate);
  }

  @Get('schedules/upcoming')
  @ApiOperation({ summary: '获取即将到来的日程提醒' })
  async getUpcomingReminders(@CurrentUser() user: { id: string }) {
    return this.scheduleService.getUpcomingReminders(user.id);
  }

  @Post('schedules/check-availability')
  @ApiOperation({ summary: '检查日程时间冲突' })
  async checkAvailability(
    @CurrentUser() user: { id: string },
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.scheduleService.checkAvailability(user.id, undefined, checkAvailabilityDto);
  }

  @Post('schedules')
  @ApiOperation({ summary: '创建个人日程' })
  async createPersonalSchedule(
    @CurrentUser() user: { id: string },
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.scheduleService.create(user.id, undefined, createScheduleDto);
  }

  @Get('schedules')
  @ApiOperation({ summary: '获取我的日程列表(分页)' })
  async findAllPersonal(
    @CurrentUser() user: { id: string },
    @Query() query: QueryScheduleDto,
  ) {
    return this.scheduleService.findAll(user.id, undefined, query);
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: '获取日程详情' })
  async findOne(@Param('id') id: string) {
    return this.scheduleService.findOne(id);
  }

  @Patch('schedules/:id')
  @ApiOperation({ summary: '更新日程' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(user.id, id, updateScheduleDto);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: '删除日程' })
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.scheduleService.remove(user.id, id);
  }

  @Post('projects/:projectId/schedules')
  @ApiOperation({ summary: '创建项目日程' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'schedule', action: 'create' })
  async createProjectSchedule(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() createScheduleDto: CreateScheduleDto,
  ) {
    return this.scheduleService.create(user.id, projectId, createScheduleDto);
  }

  @Get('projects/:projectId/schedules')
  @ApiOperation({ summary: '获取项目日程列表' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'schedule', action: 'view' })
  async findAllProject(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Query() query: QueryScheduleDto,
  ) {
    return this.scheduleService.findAll(user.id, projectId, query);
  }

  @Post('projects/:projectId/schedules/check-availability')
  @ApiOperation({ summary: '检查项目日程时间冲突' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'schedule', action: 'view' })
  async checkProjectAvailability(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.scheduleService.checkAvailability(user.id, projectId, checkAvailabilityDto);
  }
}
