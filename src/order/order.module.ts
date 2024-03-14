import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from './order.entity';
import { PRODUCT_PACKAGE_NAME, PRODUCT_SERVICE_NAME } from './proto/product.pb';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        imports: [ConfigModule],
        inject: [ConfigService],
        name: PRODUCT_SERVICE_NAME,
        useFactory: (configService: ConfigService) => {
          console.log(configService.get('PRODUCT_SERVICE_URL'));
          return {
            transport: Transport.GRPC,
            options: {
              url: configService.get('PRODUCT_SERVICE_URL'),
              package: PRODUCT_PACKAGE_NAME,
              protoPath: 'node_modules/grpc-nest-proto/proto/product.proto',
            },
          };
        },
      },
    ]),
    TypeOrmModule.forFeature([Order]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
