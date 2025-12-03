import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import { Logger } from '@nestjs/common'

/**
 * StartSchedule Use Case
 * Starts the schedule by getting next stage from queue, getting first media, starting playback, and changing to stage scene
 */
@Injectable()
export class StartScheduleUseCase {
  private readonly logger = new Logger(StartScheduleUseCase.name)

  constructor(private readonly obsService: OBSService) {}

  /**
   * Execute the start schedule use case
   * @param schedule Current schedule
   * @param stages Array of all stages
   * @returns The stage that started playing, or null if unable to start
   */
  async execute(schedule: Schedule, stages: Stage[]): Promise<Stage | null> {
    this.logger.log('Starting schedule...')

    try {
      // Check if schedule has media
      if (MediaSchedulerService.isScheduleToPlayEmpty(schedule)) {
        this.logger.warn('Schedule is empty, cannot start')
        return null
      }

      // Get next stage from queue (or available stage if queue is empty)
      let stage: Stage | undefined

      if (!StageManagerService.isStageQueueEmpty()) {
        stage = StageManagerService.popNextStageInQueue()
        this.logger.log(`Using stage ${stage?.stageNumber} from queue`)
      } else {
        stage = StageManagerService.getAvailableStage(stages)
        this.logger.log(`Using available stage ${stage?.stageNumber}`)
      }

      if (!stage) {
        this.logger.warn('No available stages to start schedule')
        return null
      }

      // Get first media from schedule
      const firstMedia = MediaSchedulerService.shiftSchedule(schedule)
      if (!firstMedia) {
        this.logger.warn('No media available in schedule')
        return null
      }

      this.logger.log(`Starting media: ${firstMedia.title} on stage ${stage.stageNumber}`)

      // Set stage in use with the media
      StageManagerService.setStageInUse(stage, [firstMedia])

      // Start media playback in OBS
      await this.startMediaPlayback(stage, firstMedia)

      // Change to stage scene
      await this.changeToStageScene(stage)

      // Mark schedule as started
      schedule.markAsStarted()

      // Update last scheduled media
      MediaSchedulerService.updateLastScheduled(schedule, firstMedia.id || '', firstMedia)

      this.logger.log(`Schedule started on stage ${stage.stageNumber}`)
      return stage
    } catch (error) {
      this.logger.error('Error starting schedule', error)
      throw error
    }
  }

  /**
   * Start media playback in OBS
   */
  private async startMediaPlayback(stage: Stage, media: any): Promise<void> {
    const obs = await this.obsService.getSocket()
    const stageName = `stage_0${stage.stageNumber}`
    const sourceName = `stage_0${stage.stageNumber}_0_${media.fileName.replace(/\.[^.]+$/, '').toLowerCase()}`

    try {
      // Get scene item ID
      const sceneItemList = await obs.call('GetSceneItemList', {
        sceneName: stageName,
      })

      const sceneItem = sceneItemList.sceneItems.find((item: any) => item.sourceName === sourceName)

      if (sceneItem) {
        // Trigger media source to play (if it's a media source)
        await obs.call('TriggerMediaInputAction', {
          inputName: sourceName,
          mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
        })

        this.logger.log(`Started playback for ${sourceName}`)
      } else {
        this.logger.warn(`Source ${sourceName} not found in scene ${stageName}`)
      }
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
