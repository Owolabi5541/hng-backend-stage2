import axios, { AxiosInstance } from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class HttpClientService {
  private client: AxiosInstance;
  constructor() {
    this.client = axios.create({
      timeout: 12000,
      headers: { 'User-Agent': 'country-exchange-api' }
    });
  }

  async get<T>(url: string) {
    // simple 2-retry logic
    for (let i = 0; i < 3; i++) {
      try {
        const res = await this.client.get<T>(url);
        return res.data;
      } catch (e) {
        if (i === 2) throw e;
      }
    }
  }
}
