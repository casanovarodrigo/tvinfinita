import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { SceneItemsService } from '#stage/infra/services/OBS/SceneItems.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaFormatterService } from '#stage/domain/services/MediaFormatter.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import { Logger } from '@nestjs/common'
import { STAGE_INFO, MAX_MEDIA_PER_STAGE } from '#stage/domain/constants/stage.constants'

/**
 * RenderNextScheduledMedia Use Case
 * Gets available stage, retrieves next media from schedule, creates OBS sources, and sets stage in use
 */
@Injectable()
export class RenderNextScheduledMediaUseCase {
  private readonly logger = new Logger(RenderNextScheduledMediaUseCase.name)

  constructor(
    private readonly obsService: OBSService,
    private readonly sceneItemsService: SceneItemsService
  ) {}

  /**
   * Execute the render next scheduled media use case
   * @param schedule Current schedule
   * @param stages Array of all stages
   * @returns The stage that was set up with media, or null if no media available
   */
  async execute(schedule: Schedule, stages: Stage[]): Promise<Stage | null> {
    this.logger.log('Rendering next scheduled media...')

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

      // Create OBS sources in the stage scene
      await this.createOBSSources(obsSources, stageName)

      // Set properties for media sources (position, scale, visibility)
      await this.setMediaSourceProperties(obsSources, stageName)

      // Set stage in use with the media queue
      StageManagerService.setStageInUse(availableStage, mediaToRender)

      // Add stage to queue so startSchedule() can use it
      StageManagerService.addStageToQueue(availableStage)

      this.logger.log(`Successfully rendered media on stage ${availableStage.stageNumber}`)
      return availableStage
    } catch (error) {
      this.logger.error('Error rendering next scheduled media', error)
      throw error
    }
  }

  /**
   * Create OBS sources in the stage scene
   */
  private async createOBSSources(sources: any[], stageName: string): Promise<void> {
    const obs = await this.obsService.getSocket()

    for (const source of sources) {
      try {
        // Check if source already exists
        const sceneItemList = await obs.call('GetSceneItemList', {
          sceneName: stageName,
        })

        const exists = sceneItemList.sceneItems.some((item: any) => item.sourceName === source.sourceName)

        if (!exists) {
          // Create the input (source)
          await obs.call('CreateInput', {
            inputName: source.sourceName,
            inputKind: source.sourceType,
            sceneName: stageName,
            inputSettings: source.sourceSettings,
          })

          this.logger.log(`Created OBS input: ${source.sourceName} in ${stageName}`)
        } else {
          // Update existing input settings
          await obs.call('SetInputSettings', {
            inputName: source.sourceName,
            inputSettings: source.sourceSettings,
          })

          this.logger.log(`Updated OBS input: ${source.sourceName} in ${stageName}`)
        }
      } catch (error) {
        this.logger.error(`Error creating OBS source ${source.sourceName}`, error)
        throw error
      }
    }
  }

  /**
   * Set properties for media sources (position, scale, visibility, bounds)
   */
  private async setMediaSourceProperties(sources: any[], stageName: string): Promise<void> {
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index]
      try {
        if (!source.metadata) {
          this.logger.warn(`Source ${source.sourceName} missing metadata, skipping property setup`)
          continue
        }

        const isVisible = index === 0

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

        this.logger.log(
          `Set properties for source: ${source.sourceName} in ${stageName} (visible: ${isVisible}, full screen: ${STAGE_INFO.width}x${STAGE_INFO.height})`
        )
      } catch (error) {
        this.logger.warn(`Error setting properties for source ${source.sourceName}`, error)
        // Continue with other sources even if one fails
      }
    }
  }
}
