import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto, UpdateProjectDto, InviteMemberDto, QueryProjectDto } from './dto/project.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('项目空间')
@Controller('projects')
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: '创建项目' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectService.create(user.id, createProjectDto);
  }

  @Get()
  @ApiOperation({ summary: '获取我参与的项目列表' })
  async findAll(@CurrentUser() user: { id: string }, @Query() query: QueryProjectDto) {
    return this.projectService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'project', action: 'view' })
  async findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新项目' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'project', action: 'edit' })
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectService.update(user.id, id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'project', action: 'delete' })
  async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.projectService.remove(user.id, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '获取项目成员列表(仅管理员可见)' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'project', action: 'manageMembers' })
  async getMembers(@Param('id') id: string) {
    return this.projectService.getMembers(id);
  }

  @Post(':id/members/invite')
  @ApiOperation({ summary: '邀请成员加入项目' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'project', action: 'manageMembers' })
  async inviteMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
  ) {
    return this.projectService.inviteMember(user.id, id, inviteMemberDto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: '移除项目成员' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'project', action: 'manageMembers' })
  async removeMember(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectService.removeMember(user.id, id, memberId);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: '更新成员角色' })
  @UseGuards(PermissionGuard)
  @RequirePermission({ module: 'project', action: 'manageRoles' })
  async updateMemberRole(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body('roleId') roleId: string,
  ) {
    return this.projectService.updateMemberRole(user.id, id, memberId, roleId);
  }
}
