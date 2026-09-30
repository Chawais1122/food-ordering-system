import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane@example.com', description: 'Email address or phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  @ApiProperty({ example: 'S3cure!Passw0rd' })
  @IsString()
  @Length(1, 72)
  password: string;
}
