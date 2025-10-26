import { IsOptional, IsString } from 'class-validator';

export class GetCountriesQueryDto {
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() sort?: 'gdp_desc' | 'gdp_asc';
}
