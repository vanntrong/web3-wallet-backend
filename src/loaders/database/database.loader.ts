import configuration from '@/configs/configuration';
import { Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseLoader {
  static init() {
    const config = configuration();
    const logger = new Logger();
    logger.log(
      `Database module is loading on port ${config.database.port}...`,
      'DatabaseModule',
    );
    logger.log(
      `config database ${JSON.stringify(config.database)}`,
      'DatabaseModule',
    );
    return TypeOrmModule.forRoot({
      ...config.database,
      type: 'postgres',
      entities: ['dist/entities/**/*.entity{.ts,.js}'],
      synchronize: true,
      ssl: {
        ca: fs.readFileSync(
          path
            .join(__dirname, '../../../certs/ap-southeast-1-bundle.pem')
            .toString(),
        ),
      },
      // logging: true,
    });
  }
}
