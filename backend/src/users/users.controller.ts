import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Get('me/favorites')
  @ApiOperation({ summary: 'Get saved vehicles' })
  getFavorites(@CurrentUser() user: JwtPayload) {
    return this.usersService.getFavorites(user.sub);
  }

  @Post('me/favorites/:vehicleId')
  @ApiOperation({ summary: 'Add vehicle to favorites' })
  addFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
  ) {
    return this.usersService.addFavorite(user.sub, vehicleId);
  }

  @Delete('me/favorites/:vehicleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove vehicle from favorites' })
  removeFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('vehicleId', ParseIntPipe) vehicleId: number,
  ) {
    return this.usersService.removeFavorite(user.sub, vehicleId);
  }
}
