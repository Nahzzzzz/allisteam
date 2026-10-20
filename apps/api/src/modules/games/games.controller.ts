import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { gameProfileInputSchema, type GameProfileInput } from '@allisteam/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthUser } from '../../types/auth-user';
import { GamesService } from './games.service';

@Controller()
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get('games')
  listGames() {
    return this.games.listGames();
  }

  @Get('me/games')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: AuthUser) {
    return this.games.listMine(user.id);
  }

  @Post('me/games')
  @UseGuards(JwtAuthGuard)
  addProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(gameProfileInputSchema)) input: GameProfileInput,
  ) {
    return this.games.addProfile(user.id, input);
  }

  @Delete('me/games/:id')
  @UseGuards(JwtAuthGuard)
  removeProfile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.games.removeProfile(user.id, id);
  }
}
