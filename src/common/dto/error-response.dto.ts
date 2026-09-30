import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 }) statusCode: number;
  @ApiProperty({ example: 'BAD_REQUEST' }) error: string;
  @ApiProperty({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message: string | string[];
  @ApiProperty({ example: '/api/v1/cart/items' }) path: string;
  @ApiProperty() timestamp: string;
  @ApiPropertyOptional() requestId?: string;
}
