import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Opaque refresh token returned by login/refresh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  refreshToken: string;
}

export class TokenPairDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ example: 'Bearer' }) tokenType: 'Bearer';
  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' }) expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
  @ApiProperty({ type: TokenPairDto }) tokens: TokenPairDto;
}
