import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { E164_PHONE_REGEX, normalizeEmail, normalizePhone } from '../../../common/utils/identifier.util';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @ApiProperty({ example: 'Jane Doe' })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '+923001234567', description: 'E.164 format' })
  @Transform(({ value }) => (typeof value === 'string' ? normalizePhone(value) : value))
  @Matches(E164_PHONE_REGEX, { message: 'phone must be in E.164 format, e.g. +923001234567' })
  phone: string;

  @ApiProperty({ example: 'S3cure!Passw0rd', minLength: 8, maxLength: 72 })
  @IsString()
  @Length(8, 72)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'password must contain at least one letter and one number' })
  password: string;
}
