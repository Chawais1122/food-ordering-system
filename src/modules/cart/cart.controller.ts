import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { API_KEY_SECURITY } from '../../common/guards/api-key.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CartService } from './cart.service';
import { AddCartItemDto, CartResponseDto, UpdateCartItemDto } from './dto/cart.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@ApiSecurity(API_KEY_SECURITY)
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current cart with live prices and total' })
  @ApiOkResponse({ type: CartResponseDto })
  getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartResponseDto> {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a product variant (increments quantity if already in cart)' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Product/variant not found' })
  @ApiUnprocessableEntityResponse({
    type: ErrorResponseDto,
    description: 'Unavailable or quantity limit exceeded',
  })
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto): Promise<CartResponseDto> {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Set the quantity of a cart item' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ErrorResponseDto })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Empty the cart' })
  @ApiNoContentResponse()
  clear(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.cartService.clear(user.id);
  }
}
