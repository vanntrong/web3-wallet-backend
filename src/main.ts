import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './errors/http-execption.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT || 80);
}
bootstrap();
