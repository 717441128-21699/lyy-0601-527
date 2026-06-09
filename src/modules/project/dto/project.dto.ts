import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ProjectStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称', example: '产品研发项目' })
  @IsString({ message: '项目名称必须是字符串' })
  @IsNotEmpty({ message: '项目名称不能为空' })
  name: string;

  @ApiPropertyOptional({ description: '项目描述', example: '团队协作平台产品研发项目' })
  @IsString({ message: '项目描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '项目标识', example: 'TCP' })
  @IsString({ message: '项目标识必须是字符串' })
  @IsNotEmpty({ message: '项目标识不能为空' })
  key: string;

  @ApiPropertyOptional({ description: '项目状态', enum: ProjectStatus, default: ProjectStatus.PLANNING })
  @IsEnum(ProjectStatus, { message: '无效的项目状态' })
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: '项目颜色', example: '#3B82F6' })
  @IsString({ message: '项目颜色必须是字符串' })
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: '项目图标', example: 'rocket' })
  @IsString({ message: '项目图标必须是字符串' })
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01T00:00:00Z' })
  @IsDateString({}, { message: '开始日期格式不正确' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2024-12-31T23:59:59Z' })
  @IsDateString({}, { message: '结束日期格式不正确' })
  @IsOptional()
  endDate?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: '项目名称', example: '产品研发项目' })
  @IsString({ message: '项目名称必须是字符串' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '项目描述', example: '团队协作平台产品研发项目' })
  @IsString({ message: '项目描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '项目状态', enum: ProjectStatus })
  @IsEnum(ProjectStatus, { message: '无效的项目状态' })
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: '项目颜色', example: '#3B82F6' })
  @IsString({ message: '项目颜色必须是字符串' })
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: '项目图标', example: 'rocket' })
  @IsString({ message: '项目图标必须是字符串' })
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: '开始日期', example: '2024-01-01T00:00:00Z' })
  @IsDateString({}, { message: '开始日期格式不正确' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期', example: '2024-12-31T23:59:59Z' })
  @IsDateString({}, { message: '结束日期格式不正确' })
  @IsOptional()
  endDate?: string;
}

export class InviteMemberDto {
  @ApiProperty({ description: '用户邮箱或ID', example: 'user@example.com' })
  @IsString({ message: '用户标识必须是字符串' })
  @IsNotEmpty({ message: '用户标识不能为空' })
  userIdentifier: string;

  @ApiPropertyOptional({ description: '角色ID', example: 'role-uuid' })
  @IsString({ message: '角色ID必须是字符串' })
  @IsOptional()
  roleId?: string;
}

export class QueryProjectDto extends PaginationDto {
  @ApiPropertyOptional({ description: '项目状态', enum: ProjectStatus })
  @IsEnum(ProjectStatus, { message: '无效的项目状态' })
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: '搜索关键词', example: '研发' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  keyword?: string;
}
