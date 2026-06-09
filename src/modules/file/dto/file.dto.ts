import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { FileType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class UploadFileDto {
  @ApiProperty({ description: '文件名称', example: '需求文档.docx' })
  @IsString({ message: '文件名称必须是字符串' })
  @IsNotEmpty({ message: '文件名称不能为空' })
  name: string;

  @ApiProperty({ description: '原始文件名', example: '需求文档.docx' })
  @IsString({ message: '原始文件名必须是字符串' })
  @IsNotEmpty({ message: '原始文件名不能为空' })
  originalName: string;

  @ApiProperty({ description: '文件存储路径', example: '/uploads/docs/需求文档.docx' })
  @IsString({ message: '文件路径必须是字符串' })
  @IsNotEmpty({ message: '文件路径不能为空' })
  path: string;

  @ApiProperty({ description: '文件大小(字节)', example: 102400 })
  @IsNotEmpty({ message: '文件大小不能为空' })
  size: number;

  @ApiPropertyOptional({ description: '文件类型', enum: FileType, default: FileType.OTHER })
  @IsEnum(FileType, { message: '无效的文件类型' })
  @IsOptional()
  type?: FileType;

  @ApiPropertyOptional({ description: 'MIME类型', example: 'application/pdf' })
  @IsString({ message: 'MIME类型必须是字符串' })
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: '文件哈希', example: 'sha256-xxx' })
  @IsString({ message: '文件哈希必须是字符串' })
  @IsOptional()
  hash?: string;

  @ApiPropertyOptional({ description: '关键词', example: ['需求', '文档'] })
  @IsArray({ message: '关键词必须是数组' })
  @IsString({ each: true, message: '关键词必须是字符串' })
  @IsOptional()
  keywords?: string[];

  @ApiPropertyOptional({ description: '文件描述', example: '第一版需求规格说明书' })
  @IsString({ message: '文件描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '关联任务ID', example: 'task-uuid' })
  @IsString({ message: '任务ID必须是字符串' })
  @IsOptional()
  taskId?: string;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ description: '文件名称', example: '需求文档.docx' })
  @IsString({ message: '文件名称必须是字符串' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '关键词', example: ['需求', '文档'] })
  @IsArray({ message: '关键词必须是数组' })
  @IsString({ each: true, message: '关键词必须是字符串' })
  @IsOptional()
  keywords?: string[];

  @ApiPropertyOptional({ description: '文件描述', example: '第一版需求规格说明书' })
  @IsString({ message: '文件描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '关联任务ID', example: 'task-uuid' })
  @IsString({ message: '任务ID必须是字符串' })
  @IsOptional()
  taskId?: string;
}

export class QueryFileDto extends PaginationDto {
  @ApiPropertyOptional({ description: '文件类型', enum: FileType })
  @IsEnum(FileType, { message: '无效的文件类型' })
  @IsOptional()
  type?: FileType;

  @ApiPropertyOptional({ description: '搜索关键词', example: '需求' })
  @IsString({ message: '搜索关键词必须是字符串' })
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '上传者ID', example: 'user-uuid' })
  @IsString({ message: '上传者ID必须是字符串' })
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '关联任务ID', example: 'task-uuid' })
  @IsString({ message: '任务ID必须是字符串' })
  @IsOptional()
  taskId?: string;
}
