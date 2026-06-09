import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { OperationLogModule } from '../operation-log/operation-log.module';

@Module({
  imports: [PrismaModule, OperationLogModule],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
