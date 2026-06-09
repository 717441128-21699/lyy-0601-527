import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FileService } from './file.service';
import { UploadFileDto, UpdateFileDto, QueryFileDto } from './dto/file.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('文件索引')
@Controller()
@ApiBearerAuth()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('files/search')
  @ApiOperation({ summary: '全局搜索文件' })
  @ApiQuery({ name: 'keyword', required: true, description: '搜索关键词' })
  async searchGlobal(
    @CurrentUser() user: { id: string },
    @Query('keyword') keyword: string,
  ) {
    return this.fileService.search(undefined, keyword);
  }

  @Post('projects/:projectId/files')
  @ApiOperation({ summary: '上传文件' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'file', action: 'upload' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() uploadFileDto: UploadFileDto,
  ) {
    return this.fileService.create(user.id, projectId, uploadFileDto);
  }

  @Get('projects/:projectId/files')
  @ApiOperation({ summary: '获取项目文件列表' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'file', action: 'view' })
  async findAll(
    @Param('projectId') projectId: string,
    @Query() query: QueryFileDto,
  ) {
    return this.fileService.findAll(projectId, query);
  }

  @Get('projects/:projectId/files/search')
  @ApiOperation({ summary: '搜索项目内文件' })
  @ApiQuery({ name: 'keyword', required: true, description: '搜索关键词' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'file', action: 'view' })
  async searchProject(
    @Param('projectId') projectId: string,
    @Query('keyword') keyword: string,
  ) {
    return this.fileService.search(projectId, keyword);
  }

  @Get('files/:id')
  @ApiOperation({ summary: '获取文件详情' })
  async findOne(@Param('id') id: string) {
    return this.fileService.findOne(id);
  }

  @Patch('files/:id')
  @ApiOperation({ summary: '更新文件信息' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'file', action: 'edit' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto,
  ) {
    return this.fileService.update(user.id, id, updateFileDto);
  }

  @Delete('files/:id')
  @ApiOperation({ summary: '删除文件' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'file', action: 'delete' })
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.fileService.remove(user.id, id);
  }
}
