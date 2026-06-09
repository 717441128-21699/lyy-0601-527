import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  IsInt,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @ApiProperty({ description: '任务标题', example: '完成需求文档编写' })
  @IsString({ message: '任务标题必须是字符串' })
  @IsNotEmpty({ message: '任务标题不能为空' })
  title: string;

  @ApiPropertyOptional({ description: '任务描述', example: '根据需求调研结果编写详细需求文档' })
  @IsString({ message: '任务描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '优先级', enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsEnum(TaskPriority, { message: '无效的优先级' })
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: '状态', enum: TaskStatus, default: TaskStatus.TODO })
  @IsEnum(TaskStatus, { message: '无效的状态' })
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ description: '处理人ID', example: 'user-uuid' })
  @IsString({ message: '处理人ID必须是字符串' })
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: '父任务ID', example: 'parent-task-uuid' })
  @IsString({ message: '父任务ID必须是字符串' })
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: '里程碑ID', example: 'milestone-uuid' })
  @IsString({ message: '里程碑ID必须是字符串' })
  @IsOptional()
  milestoneId?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01T00:00:00Z' })
  @IsDateString({}, { message: '开始日期格式不正确' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '截止日期', example: '2024-01-10T23:59:59Z' })
  @IsDateString({}, { message: '截止日期格式不正确' })
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: '预估工时(小时)', example: 16 })
  @IsNumber({}, { message: '预估工时必须是数字' })
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({ description: '标签', example: ['需求', '文档'] })
  @IsArray({ message: '标签必须是数组' })
  @IsString({ each: true, message: '标签必须是字符串' })
  @IsOptional()
  tags?: string[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: '任务标题', example: '完成需求文档编写' })
  @IsString({ message: '任务标题必须是字符串' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '任务描述', example: '根据需求调研结果编写详细需求文档' })
  @IsString({ message: '任务描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '优先级', enum: TaskPriority })
  @IsEnum(TaskPriority, { message: '无效的优先级' })
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: '状态', enum: TaskStatus })
  @IsEnum(TaskStatus, { message: '无效的状态' })
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ description: '处理人ID', example: 'user-uuid' })
  @IsString({ message: '处理人ID必须是字符串' })
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: '里程碑ID', example: 'milestone-uuid' })
  @IsString({ message: '里程碑ID必须是字符串' })
  @IsOptional()
  milestoneId?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01T00:00:00Z' })
  @IsDateString({}, { message: '开始日期格式不正确' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '截止日期', example: '2024-01-10T23:59:59Z' })
  @IsDateString({}, { message: '截止日期格式不正确' })
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: '预估工时(小时)', example: 16 })
  @IsNumber({}, { message: '预估工时必须是数字' })
  @IsOptional()
  estimatedHours?: number;

  @ApiPropertyOptional({ description: '实际工时(小时)', example: 12 })
  @IsNumber({}, { message: '实际工时必须是数字' })
  @IsOptional()
  actualHours?: number;

  @ApiPropertyOptional({ description: '排序位置', example: 0 })
  @IsInt({ message: '排序位置必须是整数' })
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: '标签', example: ['需求', '文档'] })
  @IsArray({ message: '标签必须是数组' })
  @IsString({ each: true, message: '标签必须是字符串' })
  @IsOptional()
  tags?: string[];
}

export class ChangeTaskStatusDto {
  @ApiProperty({ description: '新状态', enum: TaskStatus })
  @IsEnum(TaskStatus, { message: '无效的状态' })
  @IsNotEmpty({ message: '状态不能为空' })
  status: TaskStatus;

  @ApiPropertyOptional({ description: '变更备注', example: '已完成需求评审' })
  @IsString({ message: '变更备注必须是字符串' })
  @IsOptional()
  remark?: string;
}

export class CreateTaskCommentDto {
  @ApiProperty({ description: '评论内容', example: '请重点关注用户体验部分' })
  @IsString({ message: '评论内容必须是字符串' })
  @IsNotEmpty({ message: '评论内容不能为空' })
  content: string;

  @ApiPropertyOptional({ description: '@提及的用户ID列表', example: ['user-id-1', 'user-id-2'] })
  @IsArray({ message: '提及用户必须是数组' })
  @IsString({ each: true, message: '用户ID必须是字符串' })
  @IsOptional()
  mentions?: string[];
}

export class QueryTaskDto extends PaginationDto {
  @ApiPropertyOptional({ description: '状态', enum: TaskStatus })
  @IsEnum(TaskStatus, { message: '无效的状态' })
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ description: '优先级', enum: TaskPriority })
  @IsEnum(TaskPriority, { message: '无效的优先级' })
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: '处理人ID', example: 'user-uuid' })
  @IsString({ message: '处理人ID必须是字符串' })
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: '创建人ID', example: 'user-uuid' })
  @IsString({ message: '创建人ID必须是字符串' })
  @IsOptional()
  creatorId?: string;

  @ApiPropertyOptional({ description: '里程碑ID', example: 'milestone-uuid' })
  @IsString({ message: '里程碑ID必须是字符串' })
  @IsOptional()
  milestoneId?: string;

  @ApiPropertyOptional({ description: '搜索关键词', example: '需求' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '标签', example: '需求' })
  @IsString({ message: '标签必须是字符串' })
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: '是否包含子任务', example: false })
  @IsOptional()
  includeSubtasks?: boolean;
}

export class CreateMilestoneDto {
  @ApiProperty({ description: '里程碑名称', example: '需求分析完成' })
  @IsString({ message: '里程碑名称必须是字符串' })
  @IsNotEmpty({ message: '里程碑名称不能为空' })
  name: string;

  @ApiPropertyOptional({ description: '里程碑描述', example: '完成所有需求分析工作' })
  @IsString({ message: '里程碑描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '目标日期', example: '2024-01-31T23:59:59Z' })
  @IsDateString({}, { message: '目标日期格式不正确' })
  @IsNotEmpty({ message: '目标日期不能为空' })
  targetDate: string;

  @ApiPropertyOptional({ description: '提前提醒天数', example: [7, 3, 1] })
  @IsArray({ message: '提醒天数必须是数组' })
  @IsInt({ each: true, message: '提醒天数必须是整数' })
  @IsOptional()
  remindDays?: number[];
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional({ description: '里程碑名称', example: '需求分析完成' })
  @IsString({ message: '里程碑名称必须是字符串' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '里程碑描述', example: '完成所有需求分析工作' })
  @IsString({ message: '里程碑描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '目标日期', example: '2024-01-31T23:59:59Z' })
  @IsDateString({}, { message: '目标日期格式不正确' })
  @IsOptional()
  targetDate?: string;

  @ApiPropertyOptional({ description: '提前提醒天数', example: [7, 3, 1] })
  @IsArray({ message: '提醒天数必须是数组' })
  @IsInt({ each: true, message: '提醒天数必须是整数' })
  @IsOptional()
  remindDays?: number[];
}
