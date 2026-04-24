import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

// Load environment-specific .env file
const envFile =
  process.env.NODE_ENV === 'test'
    ? '.env.test.local'
    : process.env.NODE_ENV === 'development'
      ? '.env.development.local'
      : '.env';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  migrationsRun: true,
  synchronize: false, // turn to false in production
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.js,.ts}'],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
