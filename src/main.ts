import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const prisma = app.get(PrismaService);

  await prisma.verifyConnection();

  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
  logger.log(`HTTP server running on port ${port}`);
}

bootstrap().catch((error) => {
  console.error('Application failed to start', error);
  process.exit(1);
});
