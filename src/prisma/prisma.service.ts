import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      //  Add transaction timeout and isolation settings
      transactionOptions: {
        maxWait: 10000, // wait up to 10 seconds to acquire a transaction
        timeout: 30000, // transaction expires after 30 seconds
        isolationLevel: 'ReadCommitted',
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log(' Prisma connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log(' Prisma disconnected');
  }
}
