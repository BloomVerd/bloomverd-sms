import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { graphqlUploadExpress } from 'graphql-upload';
import helmet from 'helmet';
import { Client } from 'pg';
import { AppModule } from './app.module';

async function createDatabase(dbName: string) {
  const client = new Client({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
  });

  try {
    await client.connect();
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database ${dbName} created successfully`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`Database ${dbName} already exists`);
    } else {
      console.error(`Error creating database ${dbName}:`, error);
    }
  } finally {
    await client.end();
  }
}

async function bootstrap() {
  // Create main database
  await createDatabase(process.env.DB_NAME || 'main');

  // Create test database
  await createDatabase(process.env.DB_NAME_TEST || 'test');

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const isProduction = configService.get<string>('STAGE') === 'production';

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false, // Disable CSP in development for GraphQL Playground
      crossOriginEmbedderPolicy: !isProduction, // Disable in dev for GraphQL Playground
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );

  app.use(
    '/graphql',
    graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
  );

  // CORS configuration
  // const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: '*',
    // isProduction
    // ? corsOrigin
    //   ? corsOrigin.split(',').map((origin) => origin.trim())
    //   : false
    // :

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  await app.listen(port);
}
bootstrap();
