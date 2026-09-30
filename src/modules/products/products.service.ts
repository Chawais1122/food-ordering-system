import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { buildPaginationMeta, toOffset } from '../../common/dto/pagination.dto';
import { isUniqueViolation } from '../../common/utils/postgres-error.util';
import {
  CreateProductDto,
  CreateVariantDto,
  ProductListQueryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto/product.dto';
import { ProductListResponseDto, ProductResponseDto, VariantResponseDto } from './dto/product-response.dto';
import { ProductVariant, UQ_VARIANTS_PRODUCT_NAME, UQ_VARIANTS_SKU } from './entities/product-variant.entity';
import { Product, UQ_PRODUCTS_NAME } from './entities/product.entity';

const CONFLICT_MESSAGES: Record<string, string> = {
  [UQ_PRODUCTS_NAME]: 'A product with this name already exists',
  [UQ_VARIANTS_SKU]: 'A variant with this SKU already exists',
  [UQ_VARIANTS_PRODUCT_NAME]: 'This product already has a variant with this name',
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
  ) {}

  async list(query: ProductListQueryDto): Promise<ProductListResponseDto> {
    const qb = this.products
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variant')
      .where('product.isActive = true')
      .orderBy('product.name', 'ASC')
      .skip(toOffset(query))
      .take(query.limit);

    if (query.category) qb.andWhere('product.category = :category', { category: query.category });
    if (query.search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${this.escapeLike(query.search)}%` });
    }

    const [products, total] = await qb.getManyAndCount();
    return { data: products.map(ProductResponseDto.from), meta: buildPaginationMeta(query, total) };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.products.findOne({
      where: { id, isActive: true },
      relations: { variants: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return ProductResponseDto.from(product);
  }

  async getPurchasableVariant(productId: string, variantId: string): Promise<ProductVariant> {
    const variant = await this.variants.findOne({
      where: { id: variantId, productId },
      relations: { product: true },
    });
    if (!variant || !variant.product) {
      throw new NotFoundException('Product variant not found');
    }
    if (!variant.product.isActive || !variant.isAvailable) {
      throw new UnprocessableEntityException(
        `${variant.product.name} (${variant.name}) is currently unavailable`,
      );
    }
    return variant;
  }

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const saved = await this.withConflictMapping(() =>
      this.products.save(
        this.products.create({
          ...dto,
          variants: dto.variants.map((variant) => this.variants.create(variant)),
        }),
      ),
    );
    return ProductResponseDto.from(saved);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.getForAdmin(id);
    await this.withConflictMapping(() => this.products.save(this.products.merge(product, dto)));
    return ProductResponseDto.from(await this.getForAdmin(id));
  }

  async remove(id: string): Promise<void> {
    await this.getForAdmin(id);
    await this.dataSource.transaction(async (manager) => {
      await manager.softDelete(ProductVariant, { productId: id });
      await manager.softDelete(Product, { id });
    });
  }

  async addVariant(productId: string, dto: CreateVariantDto): Promise<VariantResponseDto> {
    await this.getForAdmin(productId);
    const variant = await this.withConflictMapping(() =>
      this.variants.save(this.variants.create({ ...dto, productId })),
    );
    return VariantResponseDto.from(variant);
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ): Promise<VariantResponseDto> {
    const variant = await this.getVariantForAdmin(productId, variantId);
    const saved = await this.withConflictMapping(() => this.variants.save(this.variants.merge(variant, dto)));
    return VariantResponseDto.from(saved);
  }

  async removeVariant(productId: string, variantId: string): Promise<void> {
    await this.getVariantForAdmin(productId, variantId);
    await this.variants.softDelete({ id: variantId });
  }

  private async getForAdmin(id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id }, relations: { variants: true } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async getVariantForAdmin(productId: string, variantId: string): Promise<ProductVariant> {
    const variant = await this.variants.findOneBy({ id: variantId, productId });
    if (!variant) throw new NotFoundException('Product variant not found');
    return variant;
  }

  private async withConflictMapping<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const constraint = Object.keys(CONFLICT_MESSAGES).find((name) => isUniqueViolation(error, name));
      if (constraint) throw new ConflictException(CONFLICT_MESSAGES[constraint]);
      throw error;
    }
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
  }
}
