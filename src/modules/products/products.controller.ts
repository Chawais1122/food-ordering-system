import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { ProductListQueryDto } from './dto/product.dto';
import { ProductListResponseDto, ProductResponseDto } from './dto/product-response.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Public()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List active products with their variants (paginated)' })
  @ApiOkResponse({ type: ProductListResponseDto })
  list(@Query() query: ProductListQueryDto): Promise<ProductListResponseDto> {
    return this.productsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product with its variants' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }
}
