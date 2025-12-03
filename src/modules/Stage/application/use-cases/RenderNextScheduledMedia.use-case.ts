import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaFormatterService } from '#stage/domain/services/MediaFormatter.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import { Logger } from '@nestjs/common'

/**
 * RenderNextScheduledMedia Use Case
 * Gets available stage, retrieves next media from schedule, creates OBS sources, and sets stage in use
 */
@Injectable()
export class RenderNextScheduledMediaUseCase {
  private readonly logger = new Logger(RenderNextScheduledMediaUseCase.name)

  constructor(private readonly obsService: OBSService) {}

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

      // Get next media from schedule (peek to see how many we need)
      const mediaToRender = MediaSchedulerService.peekNextFromSchedule(schedule, 1)
      if (mediaToRender.length === 0) {
        this.logger.warn('No media available in schedule')
        return null
      }

      const nextMedia = mediaToRender[0]
      this.logger.log(`Rendering media: ${nextMedia.title} on stage ${availableStage.stageNumber}`)

      // Format media for OBS
      const stageName = `stage_0${availableStage.stageNumber}`
      const obsSources = MediaFormatterService.formatMediaForObs([nextMedia], stageName)

      // Create OBS sources in the stage scene
      await this.createOBSSources(obsSources, stageName)

      // Set stage in use with the media queue
      StageManagerService.setStageInUse(availableStage, [nextMedia])

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
}

