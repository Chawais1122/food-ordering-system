import { OtpCode } from '../../modules/auth/entities/otp-code.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { CartItem } from '../../modules/cart/entities/cart-item.entity';
import { Cart } from '../../modules/cart/entities/cart.entity';
import { OrderItem } from '../../modules/orders/entities/order-item.entity';
import { Order } from '../../modules/orders/entities/order.entity';
import { ProductVariant } from '../../modules/products/entities/product-variant.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { User } from '../../modules/users/user.entity';
import { BackgroundJob } from '../jobs/background-job.entity';

export const ENTITIES = [
  User,
  RefreshToken,
  OtpCode,
  Product,
  ProductVariant,
  Cart,
  CartItem,
  Order,
  OrderItem,
  BackgroundJob,
];
