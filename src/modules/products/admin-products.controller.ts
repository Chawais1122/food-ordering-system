import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { API_KEY_SECURITY } from '../../common/guards/api-key.guard';
import { UserRole } from '../users/user-role.enum';
import { CreateProductDto, CreateVariantDto, UpdateProductDto, UpdateVariantDto } from './dto/product.dto';
import { ProductResponseDto, VariantResponseDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

@ApiTags('Admin - Products')
@ApiBearerAuth()
@ApiSecurity(API_KEY_SECURITY)
@Roles(UserRole.ADMIN)
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Admin role required' })
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product with at least one variant' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product fields' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a product and its variants' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }

  @Post(':id/variants')
  @ApiOperation({ summary: 'Add a variant to a product' })
  @ApiCreatedResponse({ type: VariantResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  addVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
  ): Promise<VariantResponseDto> {
    return this.productsService.addVariant(id, dto);
  }

  @Patch(':id/variants/:variantId')
  @ApiOperation({ summary: 'Update a variant (price, availability, ...)' })
  @ApiOkResponse({ type: VariantResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
  ): Promise<VariantResponseDto> {
    return this.productsService.updateVariant(id, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a variant' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<void> {
    return this.productsService.removeVariant(id, variantId);
  }
}
