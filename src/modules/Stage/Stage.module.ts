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
import { SceneItemsService } from './infra/services/OBS/SceneItems.service'
import { SceneService } from './infra/services/OBS/Scene.service'
import { SourcesService } from './infra/services/OBS/Sources.service'
import { MediaControlService } from './infra/services/OBS/MediaControl.service'
import { SceneCollectionsService } from './infra/services/OBS/SceneCollections.service'
import { OutputService } from './infra/services/OBS/Output.service'
import { OBSPriorityQueueService } from './infra/services/OBS/OBSPriorityQueue.service'
import { MediaCatalogModule } from '#mediaCatalog/MediaCatalog.module'

@Module({
  imports: [ConfigModule, MediaCatalogModule],
  controllers: [StageController],
  providers: [
    OBSService,
    SceneItemsService,
    SceneService,
    SourcesService,
    MediaControlService,
    SceneCollectionsService,
    OutputService,
    OBSPriorityQueueService,
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
