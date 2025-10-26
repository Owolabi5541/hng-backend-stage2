import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { json } from 'express';
import { AllExceptionsFilter } from './common/filters/exception.filter';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalPipes(
  new ValidationPipe({
    exceptionFactory: (errors) => {
      const details: Record<string, string> = {};
      errors.forEach((e) => {
        details[e.property] = Object.values(e.constraints ?? {}).join(', ');
      });
      return new BadRequestException({ message: 'Validation failed', details });
    },
  }),
);


  app.use(json({ limit: '1mb' }));
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Listening on ${port}`);
}
bootstrap();
