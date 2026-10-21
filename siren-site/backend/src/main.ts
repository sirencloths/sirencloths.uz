// Database timestamps are stored as UTC wall-clock values.  Force the Node
// PostgreSQL parser to read timestamp-without-time-zone columns as UTC too;
// otherwise a machine in Asia/Tashkent subtracts five hours on every read.
process.env.TZ = 'UTC';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const allowedOrigins = frontendUrl.split(',').map((url) => url.trim());

  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.enableCors({
    origin: (origin, callback) => {
      const localNetwork = /^http:\/\/(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/;
      callback(null, !origin || allowedOrigins.includes(origin) || localNetwork.test(origin));
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const swagger = new DocumentBuilder()
    .setTitle('PREVAILEN API')
    .setDescription('PREVAILEN commerce and admin API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(Number(process.env.PORT ?? 4000));
}

void bootstrap();
