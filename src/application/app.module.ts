import { PostgresModule } from '#app/dbs/postgres.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import * as Joi from 'joi'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { MediaCatalogModule } from '#mediaCatalog/MediaCatalog.module'
import { StageModule } from '#stage/Stage.module'
import { LoggingModule } from '../infra/logging/logging.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
      }),
    }),
    LoggingModule,
    PostgresModule,
    MediaCatalogModule,
    StageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
