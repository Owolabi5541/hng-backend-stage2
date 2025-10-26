import { Module } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CountriesController } from './countries.controller';
import { PrismaService } from '../prisma/prisma.service';
import { HttpClientService } from '../shared/http-client.service';
import { ImageService } from '../shared/image.service';

@Module({
  controllers: [CountriesController],
  providers: [CountriesService, PrismaService, HttpClientService, ImageService],
})
export class CountriesModule {}
