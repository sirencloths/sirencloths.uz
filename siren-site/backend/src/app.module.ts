import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataType, newDb } from 'pg-mem';
import { DataSource, DataSourceOptions } from 'typeorm';
import { randomUUID } from 'crypto';
import { entities } from './database/entities';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CommerceModule } from './commerce/commerce.module';
import { CmsModule } from './cms/cms.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Useful for isolated CI/local memory tests; normal app startup still
    // reads the existing .env file exactly as before.
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: process.env.IGNORE_ENV_FILE === 'true' }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL') ?? 'memory://siren';
        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities,
          // Local development can generate the schema; production must use migrations.
          synchronize: databaseUrl.startsWith('memory://') || config.get<string>('DB_SYNCHRONIZE') === 'true',
          ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        };
      },
      dataSourceFactory: async (options?: DataSourceOptions) => {
        if (!options) throw new Error('Database configuration is missing');
        const postgresOptions = options as DataSourceOptions & { url?: string };
        if (postgresOptions.url?.startsWith('memory://')) {
          const memory = newDb({ autoCreateForeignKeyIndices: true });
          memory.public.registerFunction({ name: 'version', returns: DataType.text, implementation: () => 'PostgreSQL 16.0' });
          memory.public.registerFunction({ name: 'current_database', returns: DataType.text, implementation: () => 'siren' });
          memory.public.registerFunction({ name: 'uuid_generate_v4', returns: DataType.uuid, implementation: randomUUID });
          const source = memory.adapters.createTypeormDataSource({ ...postgresOptions, type: 'postgres', synchronize: true } as never);
          return source.initialize();
        }
        return new DataSource(options).initialize();
      },
    }),
    AuthModule,
    CatalogModule,
    CommerceModule,
    CmsModule,
    AdminModule,
  ],
})
export class AppModule {}
