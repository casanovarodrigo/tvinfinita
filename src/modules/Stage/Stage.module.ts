import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { StageController } from './infra/controllers/Stage.controller'
import { DirectorService } from './application/services/Director.service'
import { PrepareStreamUseCase } from './application/use-cases/PrepareStream.use-case'
import { RenderBaseScenesUseCase } from './application/use-cases/RenderBaseScenes.use-case'
import { RenderNextScheduledMediaUseCase } from './application/use-cases/RenderNextScheduledMedia.use-case'
import { StartScheduleUseCase } from './application/use-cases/StartSchedule.use-case'
import { NextMediaUseCase } from './application/use-cases/NextMedia.use-case'
import { ListCronJobsUseCase } from './application/use-cases/ListCronJobs.use-case'
import { MediaTransitionUseCase } from './application/use-cases/MediaTransition.use-case'
import { ScheduleNextMediaUseCase } from './application/use-cases/ScheduleNextMedia.use-case'
import { ScheduleMediaTransitionUseCase } from './application/use-cases/ScheduleMediaTransition.use-case'
import { StopScheduleCronjobsUseCase } from './application/use-cases/StopScheduleCronjobs.use-case'
import { OBSService } from './infra/services/OBS.service'
import { SceneItemsService } from './infra/services/OBS/SceneItems.service'
import { SceneService } from './infra/services/OBS/Scene.service'
import { SourcesService } from './infra/services/OBS/Sources.service'
import { MediaControlService } from './infra/services/OBS/MediaControl.service'
import { SceneCollectionsService } from './infra/services/OBS/SceneCollections.service'
import { OutputService } from './infra/services/OBS/Output.service'
import { OBSPriorityQueueService } from './infra/services/OBS/OBSPriorityQueue.service'
import { CronJobSchedulerService } from './infra/services/CronJobScheduler.service'
import { MediaCatalogModule } from '#mediaCatalog/MediaCatalog.module'

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot(), MediaCatalogModule],
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
    CronJobSchedulerService,
    PrepareStreamUseCase,
    RenderBaseScenesUseCase,
    RenderNextScheduledMediaUseCase,
    StartScheduleUseCase,
    NextMediaUseCase,
    ListCronJobsUseCase,
    MediaTransitionUseCase,
    ScheduleNextMediaUseCase,
    ScheduleMediaTransitionUseCase,
    StopScheduleCronjobsUseCase,
    DirectorService,
  ],
  exports: [DirectorService, OBSService, CronJobSchedulerService],
})
export class StageModule {}
