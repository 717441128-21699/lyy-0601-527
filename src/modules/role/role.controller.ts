import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('成员权限')
@Controller('projects/:projectId/roles')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('template')
  @ApiOperation({ summary: '获取权限模板' })
  @RequirePermission({ module: 'project', action: 'manageRoles' })
  async getPermissionTemplate() {
    return this.roleService.getPermissionTemplate();
  }

  @Post()
  @ApiOperation({ summary: '创建角色' })
  @RequirePermission({ module: 'project', action: 'manageRoles' })
  async create(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.roleService.create(user.id, projectId, createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: '获取项目角色列表' })
  @RequirePermission({ module: 'project', action: 'view' })
  async findAll(@Param('projectId') projectId: string) {
    return this.roleService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取角色详情' })
  @RequirePermission({ module: 'project', action: 'view' })
  async findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.roleService.findOne(projectId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新角色' })
  @RequirePermission({ module: 'project', action: 'manageRoles' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(user.id, projectId, id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除角色' })
  @RequirePermission({ module: 'project', action: 'manageRoles' })
  async remove(
    @CurrentUser() user: { id: string },
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.roleService.remove(user.id, projectId, id);
  }
}
