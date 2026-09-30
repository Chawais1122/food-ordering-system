import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../user-role.enum';
import { User } from '../user.entity';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Jane Doe' }) name: string;
  @ApiProperty({ example: 'jane@example.com' }) email: string;
  @ApiProperty({ example: '+923001234567' }) phone: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() createdAt: Date;

  static from(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
