import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'APP_NAME') {
                return 'experts-backend';
              }
              throw new Error(`Missing env: ${key}`);
            },
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return a greeting from APP_NAME', () => {
      expect(appController.getHello()).toBe('Hello from experts-backend');
    });
  });

  describe('health', () => {
    it('should report the database as connected', async () => {
      await expect(appController.checkHealth()).resolves.toEqual({
        status: 'ok',
        database: 'connected',
      });
    });
  });
});
