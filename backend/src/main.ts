import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (Helmet)
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"], // Ant Design использует inline styles
              imgSrc: ["'self'", 'data:', 'blob:'],
              fontSrc: ["'self'"],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false, // Отключаем CSP в dev для удобства отладки
      // Защита от clickjacking
      frameguard: { action: 'deny' },
      // Скрываем X-Powered-By
      hidePoweredBy: true,
      // HSTS (только в проде с HTTPS)
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Запрещаем MIME sniffing
      noSniff: true,
      // XSS фильтр (для старых браузеров)
      xssFilter: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : 'http://localhost:3000',
    credentials: true,
  });

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Money Control API')
      .setDescription('API для приложения контроля доходов и расходов')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
void bootstrap();
