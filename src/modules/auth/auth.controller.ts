import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OtpRequestedResponseDto, RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, RefreshTokenDto, TokenPairDto } from './dto/token.dto';

@ApiTags('Auth')
@Public()
@AuthThrottle()
@ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed' })
@ApiTooManyRequestsResponse({ type: ErrorResponseDto, description: 'Rate limit exceeded' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Email or phone already registered' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email or phone + password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a one-time login code (passwordless)',
    description:
      'Sends a 6-digit code by email or SMS depending on the identifier. Codes expire after 5 minutes.',
  })
  @ApiAcceptedResponse({ type: OtpRequestedResponseDto })
  @ApiTooManyRequestsResponse({
    type: ErrorResponseDto,
    description: 'A code was requested for this email/phone less than a minute ago',
  })
  requestOtp(@Body() dto: RequestOtpDto): Promise<OtpRequestedResponseDto> {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a one-time code for tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Invalid, expired or already used code' })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token and get a new token pair' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPairDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiOkResponse()
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }
}
