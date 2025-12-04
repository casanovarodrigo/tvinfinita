import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { SceneItemsService } from '#stage/infra/services/OBS/SceneItems.service'
import { SceneService } from '#stage/infra/services/OBS/Scene.service'
import { OBSPriorityQueueService, OBSMethodType } from '#stage/infra/services/OBS/OBSPriorityQueue.service'
import { MediaFormatterService } from '#stage/domain/services/MediaFormatter.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import { Logger } from '@nestjs/common'

/**
 * NextMedia Use Case
 * Handles transition to next media: stops current, adds to history, checks for more media, or generates more schedule
 * Called by cronjob (ScheduleNextMediaUseCase), uses OBSPQ for all OBS operations
 */
@Injectable()
export class NextMediaUseCase {
  private readonly logger = new Logger(NextMediaUseCase.name)

  constructor(
    private readonly obsService: OBSService,
    private readonly sceneItemsService: SceneItemsService,
    private readonly sceneService: SceneService,
    private readonly obsPriorityQueueService: OBSPriorityQueueService
  ) {}

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
      // Stop current media playback via OBSPQ
      this.stopCurrentMedia(currentStage)

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
          // Show next media via OBSPQ
          const stageName = `stage_0${currentStage.stageNumber}`
          const sourceName = this.getSourceName(currentStage, nextMedia)

          this.obsPriorityQueueService.pushToQueue(OBSMethodType.SHOW_MEDIA, async () => {
            await this.sceneItemsService.setProperties(sourceName, { visible: true }, stageName)
            this.logger.log(`Showing next media in stage ${currentStage.stageNumber}`)
          })

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

            const stageName = `stage_0${nextStage.stageNumber}`
            const sourceName = this.getSourceName(nextStage, nextMedia)

            // Show media and change scene via OBSPQ
            this.obsPriorityQueueService.pushToQueue(OBSMethodType.SHOW_MEDIA, async () => {
              await this.sceneItemsService.setProperties(sourceName, { visible: true }, stageName)
              this.logger.log(`Showing media on stage ${nextStage.stageNumber}`)
            })

            this.obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_STAGE_FOCUS, async () => {
              await this.sceneService.setScene(stageName)
              StageManagerService.setStageOnScreen(nextStage)
              this.logger.log(`Changed scene to ${stageName}`)
            })

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
   * Stop current media playback via OBSPQ
   */
  private stopCurrentMedia(stage: Stage): void {
    const currentMedia = stage.peekQueue()
    if (!currentMedia) {
      return
    }

    const stageName = `stage_0${stage.stageNumber}`
    const sourceName = this.getSourceName(stage, currentMedia)

    // Hide media via OBSPQ
    this.obsPriorityQueueService.pushToQueue(OBSMethodType.HIDE_MEDIA, async () => {
      await this.sceneItemsService.setProperties(sourceName, { visible: false }, stageName)
      this.logger.log(`Stopped/hidden media: ${sourceName} on stage ${stage.stageNumber}`)
    })
  }

  /**
   * Get source name from stage and media
   */
  private getSourceName(stage: Stage, media: any): string {
    // Use MediaFormatterService to get the correct source name format
    const stageName = `stage_0${stage.stageNumber}`
    const formatted = MediaFormatterService.formatMediaForObs([media], stageName)
    return (
      formatted[0]?.sourceName ||
      `stage_0${stage.stageNumber}_0_${media.fileName.replace(/\.[^.]+$/, '').toLowerCase()}`
    )
  }
}
