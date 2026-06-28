import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List vehicles (paginated, filtered, sorted)' })
  list(@Query() query: QueryVehiclesDto) {
    return this.vehiclesService.list(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single vehicle with full details' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Public()
  @Get(':id/bid-history')
  @ApiOperation({ summary: 'Get a vehicle bid history (ascending)' })
  bidHistory(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.bidHistory(id);
  }
}
