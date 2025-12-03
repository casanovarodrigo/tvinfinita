import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import { Logger } from '@nestjs/common'

/**
 * NextMedia Use Case
 * Handles transition to next media: stops current, adds to history, checks for more media, or generates more schedule
 */
@Injectable()
export class NextMediaUseCase {
  private readonly logger = new Logger(NextMediaUseCase.name)

  constructor(private readonly obsService: OBSService) {}

  /**
   * Execute the next media use case
   * @param schedule Current schedule
   * @param currentStage Current stage playing media
   * @param stages Array of all stages
   * @returns The next stage that will play, or null if no more media
   */
  async execute(
    schedule: Schedule,
    currentStage: Stage,
    stages: Stage[]
  ): Promise<{ nextStage: Stage | null; hasMoreMedia: boolean }> {
    this.logger.log(`Moving to next media from stage ${currentStage.stageNumber}...`)

    try {
      // Stop current media playback
      await this.stopCurrentMedia(currentStage)

      // Get current media from stage queue
      const currentMedia = currentStage.peekQueue()
      if (currentMedia) {
        // Update last scheduled in the schedule
        const mediaTitleId = currentMedia.id || ''
        MediaSchedulerService.updateLastScheduled(schedule, mediaTitleId, currentMedia)

        // Remove current media from stage queue
        currentStage.shiftQueue()
      }

      // Check if more media in current stage
      if (!currentStage.isQueueEmpty()) {
        // Play next media in same stage
        const nextMedia = currentStage.peekQueue()
        if (nextMedia) {
          await this.startMediaPlayback(currentStage, nextMedia)
          this.logger.log(`Playing next media in stage ${currentStage.stageNumber}`)
          return { nextStage: currentStage, hasMoreMedia: true }
        }
      }

      // No more media in current stage, vacate it
      StageManagerService.vacateStage(currentStage)

      // Check if schedule has more media
      if (!MediaSchedulerService.isScheduleToPlayEmpty(schedule)) {
        // Get next available stage
        const nextStage = StageManagerService.getAvailableStage(stages)
        if (nextStage) {
          // Get next media from schedule
          const nextMedia = MediaSchedulerService.shiftSchedule(schedule)
          if (nextMedia) {
            // Set stage in use
            StageManagerService.setStageInUse(nextStage, [nextMedia])

            // Start playback
            await this.startMediaPlayback(nextStage, nextMedia)

            // Change to stage scene
            await this.changeToStageScene(nextStage)

            // Update last scheduled
            MediaSchedulerService.updateLastScheduled(schedule, nextMedia.id || '', nextMedia)

            this.logger.log(`Playing next media on stage ${nextStage.stageNumber}`)
            return { nextStage, hasMoreMedia: true }
          }
        }
      }

      // No more media available
      this.logger.log('No more media in schedule')
      return { nextStage: null, hasMoreMedia: false }
    } catch (error) {
      this.logger.error('Error moving to next media', error)
      throw error
    }
  }

  /**
   * Stop current media playback
   */
  private async stopCurrentMedia(stage: Stage): Promise<void> {
    const obs = await this.obsService.getSocket()

    try {
      // Get current media from stage
      const currentMedia = stage.peekQueue()
      if (!currentMedia) {
        return
      }

      const sourceName = `stage_0${stage.stageNumber}_0_${currentMedia.fileName
        .replace(/\.[^.]+$/, '')
        .toLowerCase()}`

      // Stop media playback
      await obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP',
      })

      this.logger.log(`Stopped playback for ${sourceName}`)
    } catch (error) {
      this.logger.warn(`Error stopping media on stage ${stage.stageNumber}`, error)
      // Don't throw, continue with next steps
    }
  }

  /**
   * Start media playback in OBS
   */
  private async startMediaPlayback(stage: Stage, media: any): Promise<void> {
    const obs = await this.obsService.getSocket()
    const sourceName = `stage_0${stage.stageNumber}_0_${media.fileName.replace(/\.[^.]+$/, '').toLowerCase()}`

    try {
      // Trigger media source to play
      await obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
      })

      this.logger.log(`Started playback for ${sourceName}`)
    } catch (error) {
      this.logger.error(`Error starting media playback for ${sourceName}`, error)
      throw error
    }
  }

  /**
   * Change OBS to the stage scene
   */
  private async changeToStageScene(stage: Stage): Promise<void> {
    const obs = await this.obsService.getSocket()
    const stageName = `stage_0${stage.stageNumber}`

    try {
      await obs.call('SetCurrentProgramScene', {
        sceneName: stageName,
      })

      // Set stage status to on_screen
      StageManagerService.setStageOnScreen(stage)

      this.logger.log(`Changed to scene: ${stageName}`)
    } catch (error) {
      this.logger.error(`Error changing to scene ${stageName}`, error)
      throw error
    }
  }
}
