import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

type DependencyStatus = 'up' | 'down';

@ApiTags('Health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (PostgreSQL)' })
  @ApiOkResponse({ schema: { example: { status: 'ok', database: 'up' } } })
  @ApiServiceUnavailableResponse()
  async ready(): Promise<{ status: 'ok'; database: DependencyStatus }> {
    const database = await this.check(() => this.dataSource.query('SELECT 1'));
    if (database === 'down') {
      throw new ServiceUnavailableException({ message: 'Database unavailable', database });
    }
    return { status: 'ok', database };
  }

  private async check(probe: () => Promise<unknown>): Promise<DependencyStatus> {
    try {
      await probe();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
