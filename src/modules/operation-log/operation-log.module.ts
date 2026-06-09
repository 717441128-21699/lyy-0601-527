import { Module } from '@nestjs/common';
import { OperationLogService } from './operation-log.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OperationLogService],
  exports: [OperationLogService],
})
export class OperationLogModule {}
