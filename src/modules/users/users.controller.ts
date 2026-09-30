import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiSecurity, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { API_KEY_SECURITY } from '../../common/guards/api-key.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiSecurity(API_KEY_SECURITY)
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.usersService.getById(user.id));
  }
}
