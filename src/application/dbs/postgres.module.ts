import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MediaTitleEntity } from '#mediaCatalog/infra/entities/media-title.entity'
import { PlaylistEntity } from '#mediaCatalog/infra/entities/playlist.entity'
import { TVShowMediaEntity } from '#mediaCatalog/infra/entities/tv-show-media.entity'
import { PlaylistTVShowMediaJunctionEntity } from '#mediaCatalog/infra/entities/playlist-tvshow-media.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [MediaTitleEntity, PlaylistEntity, TVShowMediaEntity, PlaylistTVShowMediaJunctionEntity],
        synchronize: true,
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class PostgresModule {}
