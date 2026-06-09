import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './common/filters/all-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(compression());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle(configService.get<string>('APP_NAME', 'Team Collaboration Platform'))
    .setDescription('团队协作平台 API 文档')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '输入 JWT 令牌',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = configService.get<number>('APP_PORT', 3000);
  const host = configService.get<string>('APP_HOST', '0.0.0.0');

  await app.listen(port, host, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   团队协作平台后端服务启动成功                                ║
║                                                              ║
║   API 地址:    http://${host}:${port}/api/v1                  ║
║   文档地址:    http://${host}:${port}/api/docs                ║
║   环境:        ${configService.get<string>('NODE_ENV', 'development')}                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

bootstrap();
