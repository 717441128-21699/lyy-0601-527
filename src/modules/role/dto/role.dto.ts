import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({ description: '角色名称', example: '测试工程师' })
  @IsString({ message: '角色名称必须是字符串' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  name: string;

  @ApiPropertyOptional({ description: '角色描述', example: '负责项目测试工作的角色' })
  @IsString({ message: '角色描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '权限配置', example: { task: { view: true, create: true } } })
  @IsNotEmpty({ message: '权限配置不能为空' })
  permissions: Record<string, Record<string, boolean>>;
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: '角色名称', example: '测试工程师' })
  @IsString({ message: '角色名称必须是字符串' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '角色描述', example: '负责项目测试工作的角色' })
  @IsString({ message: '角色描述必须是字符串' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '权限配置', example: { task: { view: true, create: true } } })
  @IsOptional()
  permissions?: Record<string, Record<string, boolean>>;
}
