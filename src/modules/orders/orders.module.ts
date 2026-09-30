import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MockPaymentGateway } from './payments/mock-payment-gateway';
import { PaymentGateway } from './payments/payment-gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, { provide: PaymentGateway, useClass: MockPaymentGateway }],
})
export class OrdersModule {}
