import { Controller, Post, Get, Query, Param, Delete, Res, HttpStatus } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { GetCountriesQueryDto } from './dto/get-countries-query.dto';
import type { Response } from 'express';

@Controller()
export class CountriesController {
  constructor(private svc: CountriesService) {}

  @Post('countries/refresh')
  async refresh() {
    try {
      const r = await this.svc.refreshAll();
      return { message: 'Refreshed', ...r };
    } catch (e) {
      if (e && e.status && e.body) {
        throw { status: e.status, response: e.body };
      }
      throw { status: 500, response: { error: 'Internal server error' } };
    }
  }

  @Get('countries')
  async list(@Query() q: GetCountriesQueryDto) {
    return this.svc.findAll(q);
  }

  @Get('countries/image')
  async getImage(@Res() res: Response) {
    const p = await this.svc.getImagePath();
    if (!p) return res.status(HttpStatus.NOT_FOUND).json({ error: 'Summary image not found' });
    return res.sendFile(require('path').resolve(p));
  }


  @Get('/status')
  async status() {
    return this.svc.status();
  }

  @Get('countries/:name')
  async getOne(@Param('name') name: string) {
    const c = await this.svc.findOneByName(name);
    if (!c) return { statusCode: HttpStatus.NOT_FOUND, error: 'Country not found' };
    return c;
  }

  @Delete('countries/:name')
  async del(@Param('name') name: string) {
    const d = await this.svc.deleteByName(name);
    if (!d) return { statusCode: HttpStatus.NOT_FOUND, error: 'Country not found' };
    return { message: 'Deleted' };
  }

}
