import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StageController } from './infra/controllers/Stage.controller'
import { DirectorService } from './application/services/Director.service'
import { PrepareStreamUseCase } from './application/use-cases/PrepareStream.use-case'
import { RenderBaseScenesUseCase } from './application/use-cases/RenderBaseScenes.use-case'
import { RenderNextScheduledMediaUseCase } from './application/use-cases/RenderNextScheduledMedia.use-case'
import { StartScheduleUseCase } from './application/use-cases/StartSchedule.use-case'
import { NextMediaUseCase } from './application/use-cases/NextMedia.use-case'
import { OBSService } from './infra/services/OBS.service'
import { MediaCatalogModule } from '#mediaCatalog/MediaCatalog.module'

@Module({
  imports: [ConfigModule, MediaCatalogModule],
  controllers: [StageController],
  providers: [
    OBSService,
    PrepareStreamUseCase,
    RenderBaseScenesUseCase,
    RenderNextScheduledMediaUseCase,
    StartScheduleUseCase,
    NextMediaUseCase,
    DirectorService,
  ],
  exports: [DirectorService, OBSService],
})
export class StageModule {}

