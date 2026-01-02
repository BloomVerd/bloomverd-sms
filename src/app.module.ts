import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { configValidationSchema } from './config.schema';
import { DatabaseModule } from './database/database.module';
import { IecModule } from './modules/iecs/iec.module';
import { OrganizationModule } from './modules/organizations/organization.module';
import { StudentModule } from './modules/students/student.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        process.env.STAGE === 'development'
          ? `.env.${process.env.STAGE}.local`
          : '.env',
      ],
      validationSchema: configValidationSchema,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      introspection: true,
      playground: true,
      driver: ApolloDriver,
      resolvers: {},
    }),
    DatabaseModule,
    OrganizationModule,
    StudentModule,
    IecModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
