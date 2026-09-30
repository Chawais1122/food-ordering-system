import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString, Length, MaxLength } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+923001234567', description: 'Email address or phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}

export class VerifyOtpDto extends RequestOtpDto {
  @ApiProperty({ example: '482913' })
  @IsNumberString({ no_symbols: true })
  @Length(4, 10)
  code: string;
}

export class OtpRequestedResponseDto {
  @ApiProperty({ example: 'If the account exists, a login code has been sent' })
  message: string;

  @ApiProperty({ example: 300 })
  expiresInSeconds: number;
}
