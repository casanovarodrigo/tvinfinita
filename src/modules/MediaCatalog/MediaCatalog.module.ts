import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MediaTitleEntity } from './infra/entities/media-title.entity'
import { PlaylistEntity } from './infra/entities/playlist.entity'
import { TVShowMediaEntity } from './infra/entities/tv-show-media.entity'
import { PlaylistTVShowMediaJunctionEntity } from './infra/entities/playlist-tvshow-media.entity'
import { MediaTitleRepository } from './infra/repositories/MediaTitle.repository'
import { PlaylistRepository } from './infra/repositories/Playlist.repository'
import { TVShowMediaRepository } from './infra/repositories/TVShowMedia.repository'
import { MediaDiscoveryController } from '#mediaCatalog/infra/controllers/MediaDiscovery.controller'
import { MediaRegistrationController } from './infra/controllers/MediaRegistration.controller'
import { MediaDiscoveryClass } from './infra/repositories/MediaDiscovery/MediaDiscovery'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MediaTitleEntity,
      PlaylistEntity,
      TVShowMediaEntity,
      PlaylistTVShowMediaJunctionEntity,
    ]),
  ],
  controllers: [MediaDiscoveryController, MediaRegistrationController],
  providers: [MediaTitleRepository, PlaylistRepository, TVShowMediaRepository, MediaDiscoveryClass],
  exports: [MediaTitleRepository, PlaylistRepository, TVShowMediaRepository, MediaDiscoveryClass],
})
export class MediaCatalogModule {}
