import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { API_KEY_SECURITY } from '../../common/guards/api-key.guard';
import { UserRole } from '../users/user-role.enum';
import { OrderResponseDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Admin - Orders')
@ApiBearerAuth()
@ApiSecurity(API_KEY_SECURITY)
@Roles(UserRole.ADMIN)
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a PENDING order as PAID (e.g. cash collected on delivery)' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  markPaid(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.ordersService.markPaidByAdmin(id);
  }
}
