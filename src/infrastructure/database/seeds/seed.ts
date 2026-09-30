import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { configuration } from '../../../config/configuration';
import { ProductVariant } from '../../../modules/products/entities/product-variant.entity';
import { Product } from '../../../modules/products/entities/product.entity';
import { UserRole } from '../../../modules/users/user-role.enum';
import { User } from '../../../modules/users/user.entity';
import dataSource from '../data-source';

interface SeedProduct {
  name: string;
  category: string;
  description: string;
  variants: Array<Pick<ProductVariant, 'name' | 'sku' | 'priceMinor'>>;
}

const CATALOG: SeedProduct[] = [
  {
    name: 'Chicken Wings',
    category: 'Chicken',
    description: 'Crispy wings tossed in house buffalo sauce',
    variants: [
      { name: '8pc', sku: 'WINGS-8PC', priceMinor: 899 },
      { name: '16pc', sku: 'WINGS-16PC', priceMinor: 1599 },
    ],
  },
  {
    name: 'Burger',
    category: 'Burgers',
    description: 'Flame-grilled beef patty, cheddar, pickles and house sauce',
    variants: [
      { name: 'Single', sku: 'BURGER-SINGLE', priceMinor: 799 },
      { name: 'Double', sku: 'BURGER-DOUBLE', priceMinor: 1199 },
    ],
  },
  {
    name: 'Pizza Margherita',
    category: 'Pizza',
    description: 'San Marzano tomato, fior di latte, basil',
    variants: [
      { name: 'Small (8")', sku: 'PIZZA-MARG-S', priceMinor: 999 },
      { name: 'Medium (12")', sku: 'PIZZA-MARG-M', priceMinor: 1399 },
      { name: 'Large (16")', sku: 'PIZZA-MARG-L', priceMinor: 1799 },
    ],
  },
  {
    name: 'Fries',
    category: 'Sides',
    description: 'Skin-on fries with sea salt',
    variants: [
      { name: 'Regular', sku: 'FRIES-REG', priceMinor: 299 },
      { name: 'Large', sku: 'FRIES-LRG', priceMinor: 449 },
    ],
  },
  {
    name: 'Soft Drink',
    category: 'Drinks',
    description: 'Cola, lemon-lime or orange',
    variants: [
      { name: 'Can', sku: 'DRINK-CAN', priceMinor: 199 },
      { name: '1.5L Bottle', sku: 'DRINK-1500', priceMinor: 349 },
    ],
  },
];

async function seed(): Promise<void> {
  const logger = new Logger('Seed');
  const { bcryptRounds } = configuration().auth;
  await dataSource.initialize();

  try {
    const email = process.env.SEED_ADMIN_EMAIL;
    const phone = process.env.SEED_ADMIN_PHONE;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const users = dataSource.getRepository(User);

    if (email && phone && password) {
      if (await users.existsBy({ email: email.toLowerCase() })) {
        logger.log(`Admin ${email} already exists`);
      } else {
        await users.save(
          users.create({
            name: 'Administrator',
            email: email.toLowerCase(),
            phone,
            role: UserRole.ADMIN,
            passwordHash: await bcrypt.hash(password, bcryptRounds),
          }),
        );
        logger.log(`Created admin ${email}`);
      }
    } else {
      logger.warn('SEED_ADMIN_EMAIL/PHONE/PASSWORD not set; skipping admin user');
    }

    const products = dataSource.getRepository(Product);
    for (const item of CATALOG) {
      if (await products.existsBy({ name: item.name })) continue;
      await products.save(
        products.create({
          ...item,
          variants: item.variants.map((variant) => dataSource.getRepository(ProductVariant).create(variant)),
        }),
      );
      logger.log(`Created product ${item.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error: Error) => {
  new Logger('Seed').error(error.message, error.stack);
  process.exit(1);
});
