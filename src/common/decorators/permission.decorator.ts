import { SetMetadata } from '@nestjs/common';

export interface PermissionRequirement {
  module: 'project' | 'task' | 'schedule' | 'file' | 'stats';
  action: string;
}

export const PERMISSION_KEY = 'permission';
export const RequirePermission = (requirement: PermissionRequirement) =>
  SetMetadata(PERMISSION_KEY, requirement);
