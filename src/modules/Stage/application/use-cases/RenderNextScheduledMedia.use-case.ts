import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { SceneItemsService } from '#stage/infra/services/OBS/SceneItems.service'
import { SourcesService } from '#stage/infra/services/OBS/Sources.service'
import { OBSPriorityQueueService, OBSMethodType } from '#stage/infra/services/OBS/OBSPriorityQueue.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaFormatterService } from '#stage/domain/services/MediaFormatter.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import * as winston from 'winston'
import { LoggerService } from '../../../../infra/logging/services/logger.service'
import { STAGE_INFO, MAX_MEDIA_PER_STAGE } from '#stage/domain/constants/stage.constants'

/**
 * RenderNextScheduledMedia Use Case
 * Gets available stage, retrieves next media from schedule, creates OBS sources, and sets stage in use
 */
@Injectable()
export class RenderNextScheduledMediaUseCase {
  private readonly logger: winston.Logger

  constructor(
    private readonly obsService: OBSService,
    private readonly sceneItemsService: SceneItemsService,
    private readonly sourcesService: SourcesService,
    private readonly obsPriorityQueueService: OBSPriorityQueueService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getDirectorLogger(RenderNextScheduledMediaUseCase.name)
  }

  /**
   * Execute the render next scheduled media use case
   * @param schedule Current schedule
   * @param stages Array of all stages
   * @returns The stage that was set up with media, or null if no media available
   */
  async execute(schedule: Schedule, stages: Stage[]): Promise<Stage | null> {
    this.logger.info('Rendering next scheduled media...')

    try {
      // Check if schedule has media
      if (MediaSchedulerService.isScheduleToPlayEmpty(schedule)) {
        this.logger.warn('Schedule is empty, no media to render')
        return null
      }

      // Get available stage
      const availableStage = StageManagerService.getAvailableStage(stages)
      if (!availableStage) {
        this.logger.warn('No available stages found')
        return null
      }

      // Get next media from schedule (peek up to MAX_MEDIA_PER_STAGE items)
      const peekedMedia = MediaSchedulerService.peekNextFromSchedule(schedule, MAX_MEDIA_PER_STAGE)
      if (peekedMedia.length === 0) {
        this.logger.warn('No media available in schedule')
        return null
      }

      // Ensure we don't exceed the limit (safety check)
      const mediaToRender = peekedMedia.slice(0, MAX_MEDIA_PER_STAGE)

      if (mediaToRender.length > MAX_MEDIA_PER_STAGE) {
        this.logger.error(
          `CRITICAL: Attempted to render ${mediaToRender.length} items, but limit is ${MAX_MEDIA_PER_STAGE}. Truncating.`
        )
        mediaToRender.splice(MAX_MEDIA_PER_STAGE)
      }

      // Format media for OBS
      const stageName = `stage_0${availableStage.stageNumber}`
      const obsSources = MediaFormatterService.formatMediaForObs(mediaToRender, stageName)

      // Convert to SourcesService format for batch creation
      const sourceConfigs = obsSources.map((source, index) => ({
        sourceName: source.sourceName,
        sourceKind: source.sourceType,
        sceneName: stageName,
        sourceSettings: source.sourceSettings,
        setVisible: index === 0, // First source visible, others hidden
      }))

      // Create sources via OBSPQ
      this.obsPriorityQueueService.pushToQueue(OBSMethodType.BATCH_MEDIUM_CREATE_SOURCE, async () => {
        await this.sourcesService.batchCreate(sourceConfigs)
      })

      // Set properties for media sources via OBSPQ (for each source)
      for (let index = 0; index < obsSources.length; index++) {
        const source = obsSources[index]
        if (!source.metadata) {
          this.logger.warn(`Source ${source.sourceName} missing metadata, skipping property setup`)
          continue
        }

        const isVisible = index === 0

        this.obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_MEDIA_PROPERTIES, async () => {
          await this.sceneItemsService.setProperties(
            source.sourceName,
            {
              visible: isVisible,
              position: {
                x: 0,
                y: 0,
              },
              bounds: {
                type: 'OBS_BOUNDS_STRETCH',
                alignment: 5,
                x: STAGE_INFO.width,
                y: STAGE_INFO.height,
              },
            },
            stageName
          )

          this.logger.info(
            `Set properties for source: ${source.sourceName} in ${stageName} (visible: ${isVisible}, full screen: ${STAGE_INFO.width}x${STAGE_INFO.height})`
          )
        })
      }

      // Set stage in use with the media queue
      StageManagerService.setStageInUse(availableStage, mediaToRender)

      // Add stage to queue so startSchedule() can use it
      StageManagerService.addStageToQueue(availableStage)

      this.logger.info(`Successfully rendered media on stage ${availableStage.stageNumber}`)
      return availableStage
    } catch (error) {
      this.logger.error('Error rendering next scheduled media', { error })
      throw error
    }
  }
}
