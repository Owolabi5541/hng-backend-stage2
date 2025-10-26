import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import sharp from 'sharp'; // ✅ fixed
import { Country } from '@prisma/client';

@Injectable()
export class ImageService {
  constructor() {}

  async generateSummary(path: string, total: number, top5: Partial<Country>[], ts: string) {
    await fs.ensureDir(require('path').dirname(path));
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="40" y="80" font-size="36" font-family="Arial">Countries Summary</text>
      <text x="40" y="130" font-size="24" font-family="Arial">Total countries: ${total}</text>
      ${top5.map((r, i) => `<text x="40" y="${190 + i*40}" font-size="20" font-family="Arial">${i+1}. ${escapeXml(r.name)} — ${formatNumber(r.estimated_gdp)}</text>`).join('')}
      <text x="40" y="740" font-size="16" font-family="Arial">Last refreshed: ${ts}</text>
    </svg>`;

    const buffer = Buffer.from(svg);
    await sharp(buffer).png().toFile(path); // ✅ works now
  }
}

function escapeXml(unsafe?: string): string {
  const safe = unsafe ?? '';
  return safe.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!)
  );
}

function formatNumber(n?: number | null) {
  if (n === null || n === undefined) return 'N/A';
  return Number(n).toLocaleString();
}
