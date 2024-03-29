import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientGrpc } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Order } from './order.entity';
import {
  DecreaseStockResponse,
  FindOneResponse,
  PRODUCT_SERVICE_NAME,
  ProductServiceClient,
} from './proto/product.pb';
import { CreateOrderRequest, CreateOrderResponse } from './proto/order.pb';

@Injectable()
export class OrderService implements OnModuleInit {
  private productSvc: ProductServiceClient;

  @Inject(PRODUCT_SERVICE_NAME)
  private readonly client: ClientGrpc;

  @InjectRepository(Order)
  private readonly repository: Repository<Order>;

  public onModuleInit(): void {
    this.productSvc =
      this.client.getService<ProductServiceClient>(PRODUCT_SERVICE_NAME);
  }

  public async createOrder(
    data: CreateOrderRequest,
  ): Promise<CreateOrderResponse> {
    const product: FindOneResponse = await firstValueFrom(
      this.productSvc.findOne({ id: data.productId }),
    );

    if (product.status >= HttpStatus.NOT_FOUND) {
      return { id: null, error: ['Product not found'], status: product.status };
    } else if (product.data.stock < data.quantity) {
      return {
        id: null,
        error: ['Stock too less'],
        status: HttpStatus.CONFLICT,
      };
    }

    const order: Order = new Order();

    order.price = product.data.price;
    order.productId = product.data.id;
    order.userId = data.userId;

    await this.repository.save(order);

    const decreaseStockData: DecreaseStockResponse = await firstValueFrom(
      this.productSvc.decreaseStock({ id: data.productId, orderId: order.id }),
    );

    if (decreaseStockData.status === HttpStatus.CONFLICT) {
      // Borrar la orden si el decremento falló
      await this.repository.remove(order);

      return {
        id: null,
        error: decreaseStockData.error,
        status: HttpStatus.CONFLICT,
      };
    }

    return { id: order.id, error: null, status: HttpStatus.OK };
  }
}
