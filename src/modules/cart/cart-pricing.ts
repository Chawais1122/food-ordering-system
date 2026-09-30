import { multiplyMinor, sumMinor } from '../../common/utils/money.util';
import { CartItem } from './entities/cart-item.entity';

export interface PricedCartLine {
  item: CartItem;
  unitPriceMinor: number;
  lineTotalMinor: number;
  isAvailable: boolean;
}

export interface PricedCart {
  lines: PricedCartLine[];
  itemCount: number;
  totalAmountMinor: number;
}

export const isCartItemAvailable = (item: CartItem): boolean =>
  Boolean(
    item.variant &&
    item.product &&
    !item.variant.deletedAt &&
    !item.product.deletedAt &&
    item.variant.isAvailable &&
    item.product.isActive,
  );

export const priceCart = (items: CartItem[]): PricedCart => {
  const lines = items.map((item): PricedCartLine => {
    const unitPriceMinor = item.variant?.priceMinor ?? 0;
    return {
      item,
      unitPriceMinor,
      lineTotalMinor: multiplyMinor(unitPriceMinor, item.quantity),
      isAvailable: isCartItemAvailable(item),
    };
  });
  const available = lines.filter((line) => line.isAvailable);
  return {
    lines,
    itemCount: available.reduce((count, line) => count + line.item.quantity, 0),
    totalAmountMinor: sumMinor(available.map((line) => line.lineTotalMinor)),
  };
};
