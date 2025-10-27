import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpClientService } from '../shared/http-client.service';
import { ImageService } from '../shared/image.service';
import * as dotenv from 'dotenv';
dotenv.config();

const COUNTRIES_API = process.env.COUNTRIES_API;
const EXCHANGE_API = process.env.EXCHANGE_API;
const IMAGE_CACHE_PATH = process.env.IMAGE_CACHE_PATH || './cache/summary.png';

@Injectable()
export class CountriesService {
  private readonly logger = new Logger(CountriesService.name);

  // chunk size controls concurrency / DB load; tune as needed (50 is a good default for ~200 records)
  private readonly CHUNK_SIZE = 50;

  constructor(
    private prisma: PrismaService,
    private http: HttpClientService,
    private imageService: ImageService,
  ) {}

  /**
   * Refresh countries and exchange rates, upsert into DB and regenerate summary image.
   */
  async refreshAll() {
    if (!COUNTRIES_API || !EXCHANGE_API) {
      throw new Error('External API URLs not configured');
    }

    // --- Fetch countries ---
    let countriesRaw: any[] = [];
    try {
      const res = await this.http.get<any>(COUNTRIES_API);
      if (res && Array.isArray(res)) countriesRaw = res;
      else if (res && Array.isArray(res.data)) countriesRaw = res.data;
      else if (res && Array.isArray((res as any).countries)) countriesRaw = (res as any).countries;
      else countriesRaw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      this.logger.error('Failed to fetch countries API', e);
      throw { status: 503, body: { error: 'External data source unavailable', details: 'Could not fetch data from Countries API' } };
    }

    // --- Fetch exchange rates ---
    let ratesRaw: any = {};
    try {
      const res = await this.http.get<any>(EXCHANGE_API);
      if (res && res.data && typeof res.data === 'object') ratesRaw = res.data;
      else if (res && typeof res === 'object') ratesRaw = res;
      else ratesRaw = {};
    } catch (e) {
      this.logger.error('Failed to fetch exchange API', e);
      throw { status: 503, body: { error: 'External data source unavailable', details: 'Could not fetch data from Exchange Rates API' } };
    }

    const ratesMap: Record<string, number> = {};
    if (ratesRaw && typeof ratesRaw === 'object') {
      if (ratesRaw.rates && typeof ratesRaw.rates === 'object') Object.assign(ratesMap, ratesRaw.rates);
      else if (ratesRaw.result && ratesRaw.rates) Object.assign(ratesMap, ratesRaw.rates);
      else Object.assign(ratesMap, ratesRaw);
    }

    // --- Prepare country objects ---
    const prepared = countriesRaw.map((c: any) => {
      const population = c?.population ?? 0;
      const name = c?.name ?? null;
      const capital = c?.capital ?? null;
      const region = c?.region ?? null;
      const flag_url = c?.flag ?? c?.flags?.svg ?? null;

      let currency_code: string | null = null;
      if (Array.isArray(c?.currencies) && c.currencies.length > 0) currency_code = c.currencies[0]?.code ?? null;
      else if (c?.currencies && typeof c.currencies === 'object') {
        const keys = Object.keys(c.currencies);
        if (keys.length > 0) currency_code = keys[0];
      } else if (c?.currency) currency_code = c.currency;

      let popBigInt: bigint;
      try {
        const popNum = typeof population === 'bigint' ? Number(population) : Number(population ?? 0);
        popBigInt = BigInt(Math.max(0, Math.trunc(popNum || 0)));
      } catch {
        popBigInt = BigInt(0);
      }

      const ex = currency_code ? ratesMap[currency_code] ?? ratesMap[currency_code?.toUpperCase?.()] ?? null : null;
      const m = randomInt(1000, 2000);
      const popNum = Number(popBigInt);
      const estimated_gdp = ex ? (popNum * m) / Number(ex) : null;

      return {
        name,
        capital,
        region,
        population: popBigInt,
        currency_code,
        exchange_rate: ex ? Number(ex) : null,
        estimated_gdp: estimated_gdp !== null ? Number(estimated_gdp) : null,
        flag_url,
        last_refreshed_at: new Date(),
      };
    });

    // --- Persist to DB in chunks (avoid a single long transaction) ---
    try {
      // chunk helper
      const chunks: any[][] = [];
      for (let i = 0; i < prepared.length; i += this.CHUNK_SIZE) {
        chunks.push(prepared.slice(i, i + this.CHUNK_SIZE));
      }

      for (const [index, chunk] of chunks.entries()) {
        this.logger.log(`Processing chunk ${index + 1}/${chunks.length} (${chunk.length} items)`);

        // prepare concurrent operations for this chunk
        const ops = chunk.map((p) => this.upsertCountrySafe(p));

        // run them in parallel but limited to chunk size
        await Promise.all(ops);
      }

      // Update meta (single upsert)
      await this.prisma.meta.upsert({
        where: { id: 1 },
        create: { id: 1, last_refreshed_at: new Date(), total_countries: prepared.length },
        update: { last_refreshed_at: new Date(), total_countries: prepared.length },
      });
    } catch (e) {
      this.logger.error('DB transaction failed', e);
      throw { status: 500, body: { error: 'Internal server error' } };
    }

    // --- Generate summary image ---
    try {
      const top5 = prepared
        .filter((p) => p.estimated_gdp !== null)
        .sort((a, b) => (b.estimated_gdp ?? 0) - (a.estimated_gdp ?? 0))
        .slice(0, 5)
        .map((p) => ({ name: p.name, estimated_gdp: p.estimated_gdp }));

      await this.imageService.generateSummary(IMAGE_CACHE_PATH, prepared.length, top5, new Date().toISOString());
    } catch (e) {
      this.logger.error('Image generation failed', e);
    }

    return { total: prepared.length, last_refreshed_at: new Date().toISOString() };
  }

  /**
   * Helper: safely update or create a country record.
   * Uses updateMany -> create fallback to avoid upsert assumptions about unique constraints.
   */
  private async upsertCountrySafe(p: any) {
    try {
      if (!p?.name) {
        // nothing to match on; attempt create
        await this.prisma.country.create({ data: p });
        return;
      }

      // updateMany returns a count; if no rows were updated we create
      const updateResult = await this.prisma.country.updateMany({
        where: { name: { equals: p.name } },
        data: {
          capital: p.capital,
          region: p.region,
          population: p.population,
          currency_code: p.currency_code,
          exchange_rate: p.exchange_rate,
          estimated_gdp: p.estimated_gdp,
          flag_url: p.flag_url,
          last_refreshed_at: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // no existing record matched, create a new one
        await this.prisma.country.create({ data: p });
      }
    } catch (err) {
      // log but don't throw — allow other records to proceed
      this.logger.error(`Failed to upsert country ${p?.name}`, err);
    }
  }

  async findAll(query: any) {
    const where: any = {};
    if (query?.region) where.region = query.region;
    if (query?.currency) where.currency_code = query.currency;

    const orderBy: any =
      query?.sort === 'gdp_desc'
        ? { estimated_gdp: 'desc' }
        : query?.sort === 'gdp_asc'
        ? { estimated_gdp: 'asc' }
        : undefined;

    try {
      const countries = await this.prisma.country.findMany({ where, orderBy });
      return serializeBigInt(countries);
    } catch (error) {
      this.logger.error('Prisma findMany failed', error);
      throw new Error('Database query failed');
    }
  }

  async findOneByName(name: string) {
    if (!name) return null;
    const country = await this.prisma.country.findFirst({
      where: { name: { equals: name } },
    });
    if (!country) return null;
    return serializeBigInt(country);
  }

  async deleteByName(name: string) {
    const country = await this.findOneByName(name);
    if (!country) return null;
    await this.prisma.country.delete({ where: { id: country.id } });
    return country;
  }

  async status() {
    const meta = await this.prisma.meta.findUnique({ where: { id: 1 } });
    return { total_countries: meta?.total_countries ?? 0, last_refreshed_at: meta?.last_refreshed_at?.toISOString() ?? null };
  }

  async getImagePath() {
    const fs = require('fs');
    return fs.existsSync(IMAGE_CACHE_PATH) ? IMAGE_CACHE_PATH : null;
  }
}

/** Helper: random int inclusive */
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Helper: convert BigInt to Number for JSON */
function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? Number(value) : value)));
}
