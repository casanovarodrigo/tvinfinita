import { Module } from '@nestjs/common'

// import { AppService } from './app.service'
import { MediaDiscoveryController } from '#mediaCatalog/infra/controllers/MediaDiscovery.controller'

@Module({
  imports: [],
  controllers: [MediaDiscoveryController],
  // providers: [AppService],
  providers: [],
})
export class MediaCatalogModule {}
