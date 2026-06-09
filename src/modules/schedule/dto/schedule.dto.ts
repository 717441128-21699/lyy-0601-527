import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  IsInt,
} from 'class-validator';
import { ScheduleType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateScheduleDto {
  @ApiProperty({ description: '日程标题', example: '需求评审会议' })
  @IsString({ message: '日程标题必须是字符串' })
  @IsNotEmpty({ message: '日程标题不能为空' })
  title: string;

  @ApiPropertyOptional({ description: '日程描述', example: '评审第一版需求规格说明书' })
  @IsString({ message: '日程描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '日程类型', enum: ScheduleType, default: ScheduleType.MEETING })
  @IsEnum(ScheduleType, { message: '无效的日程类型' })
  @IsOptional()
  type?: ScheduleType;

  @ApiProperty({ description: '开始时间', example: '2024-01-15T10:00:00Z' })
  @IsDateString({}, { message: '开始时间格式不正确' })
  @IsNotEmpty({ message: '开始时间不能为空' })
  startTime: string;

  @ApiProperty({ description: '结束时间', example: '2024-01-15T12:00:00Z' })
  @IsDateString({}, { message: '结束时间格式不正确' })
  @IsNotEmpty({ message: '结束时间不能为空' })
  endTime: string;

  @ApiPropertyOptional({ description: '是否全天', example: false })
  @IsBoolean({ message: '是否全天必须是布尔值' })
  @IsOptional()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: '地点', example: '会议室A' })
  @IsString({ message: '地点必须是字符串' })
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '会议链接', example: 'https://meet.example.com/123' })
  @IsString({ message: '会议链接必须是字符串' })
  @IsOptional()
  meetingLink?: string;

  @ApiPropertyOptional({ description: '重复规则', example: 'FREQ=WEEKLY;BYDAY=MO' })
  @IsString({ message: '重复规则必须是字符串' })
  @IsOptional()
  repeatRule?: string;

  @ApiPropertyOptional({ description: '提前提醒分钟数', example: [60, 30, 15] })
  @IsArray({ message: '提醒时间必须是数组' })
  @IsInt({ each: true, message: '提醒时间必须是整数' })
  @IsOptional()
  remindMinutes?: number[];

  @ApiPropertyOptional({ description: '参会人ID列表', example: ['user-id-1', 'user-id-2'] })
  @IsArray({ message: '参会人必须是数组' })
  @IsString({ each: true, message: '参会人ID必须是字符串' })
  @IsOptional()
  attendees?: string[];
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: '日程标题', example: '需求评审会议' })
  @IsString({ message: '日程标题必须是字符串' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '日程描述', example: '评审第一版需求规格说明书' })
  @IsString({ message: '日程描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '日程类型', enum: ScheduleType })
  @IsEnum(ScheduleType, { message: '无效的日程类型' })
  @IsOptional()
  type?: ScheduleType;

  @ApiPropertyOptional({ description: '开始时间', example: '2024-01-15T10:00:00Z' })
  @IsDateString({}, { message: '开始时间格式不正确' })
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2024-01-15T12:00:00Z' })
  @IsDateString({}, { message: '结束时间格式不正确' })
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: '是否全天', example: false })
  @IsBoolean({ message: '是否全天必须是布尔值' })
  @IsOptional()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: '地点', example: '会议室A' })
  @IsString({ message: '地点必须是字符串' })
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '会议链接', example: 'https://meet.example.com/123' })
  @IsString({ message: '会议链接必须是字符串' })
  @IsOptional()
  meetingLink?: string;

  @ApiPropertyOptional({ description: '重复规则', example: 'FREQ=WEEKLY;BYDAY=MO' })
  @IsString({ message: '重复规则必须是字符串' })
  @IsOptional()
  repeatRule?: string;

  @ApiPropertyOptional({ description: '提前提醒分钟数', example: [60, 30, 15] })
  @IsArray({ message: '提醒时间必须是数组' })
  @IsInt({ each: true, message: '提醒时间必须是整数' })
  @IsOptional()
  remindMinutes?: number[];

  @ApiPropertyOptional({ description: '参会人ID列表', example: ['user-id-1', 'user-id-2'] })
  @IsArray({ message: '参会人必须是数组' })
  @IsString({ each: true, message: '参会人ID必须是字符串' })
  @IsOptional()
  attendees?: string[];
}

export class QueryScheduleDto extends PaginationDto {
  @ApiPropertyOptional({ description: '开始日期范围', example: '2024-01-01T00:00:00Z' })
  @IsDateString({}, { message: '开始日期格式不正确' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期范围', example: '2024-01-31T23:59:59Z' })
  @IsDateString({}, { message: '结束日期格式不正确' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '日程类型', enum: ScheduleType })
  @IsEnum(ScheduleType, { message: '无效的日程类型' })
  @IsOptional()
  type?: ScheduleType;

  @ApiPropertyOptional({ description: '用户ID', example: 'user-uuid' })
  @IsString({ message: '用户ID必须是字符串' })
  @IsOptional()
  userId?: string;
}

export class CheckAvailabilityDto {
  @ApiProperty({ description: '开始时间', example: '2024-01-15T10:00:00Z' })
  @IsDateString({}, { message: '开始时间格式不正确' })
  @IsNotEmpty({ message: '开始时间不能为空' })
  startTime: string;

  @ApiProperty({ description: '结束时间', example: '2024-01-15T12:00:00Z' })
  @IsDateString({}, { message: '结束时间格式不正确' })
  @IsNotEmpty({ message: '结束时间不能为空' })
  endTime: string;

  @ApiPropertyOptional({ description: '要排除的日程ID', example: 'schedule-uuid' })
  @IsString({ message: '排除日程ID必须是字符串' })
  @IsOptional()
  excludeId?: string;

  @ApiPropertyOptional({ description: '要检查的用户ID列表', example: ['user-id-1', 'user-id-2'] })
  @IsArray({ message: '用户ID必须是数组' })
  @IsString({ each: true, message: '用户ID必须是字符串' })
  @IsOptional()
  userIds?: string[];
}
