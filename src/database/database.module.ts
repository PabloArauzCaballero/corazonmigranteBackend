import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { databaseModels } from './models';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        database: config.get<string>('database.name'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        models: databaseModels,
        autoLoadModels: false,
        synchronize: false,
        logging: config.get<boolean>('database.logging') ? console.log : false,
        dialectOptions: config.get<boolean>('database.ssl')
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : undefined,
      }),
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
