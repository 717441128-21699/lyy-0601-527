import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectModule } from './modules/project/project.module';
import { RoleModule } from './modules/role/role.module';
import { TaskModule } from './modules/task/task.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { FileModule } from './modules/file/file.module';
import { MessageModule } from './modules/message/message.module';
import { StatsModule } from './modules/stats/stats.module';
import { OperationLogModule } from './modules/operation-log/operation-log.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60),
          limit: configService.get<number>('THROTTLE_LIMIT', 1000),
        },
      ],
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    ProjectModule,
    RoleModule,
    TaskModule,
    ScheduleModule,
    FileModule,
    MessageModule,
    StatsModule,
    OperationLogModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
