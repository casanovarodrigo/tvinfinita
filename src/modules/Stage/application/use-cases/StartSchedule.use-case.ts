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
import { Logger } from '@nestjs/common'
import { STAGE_INFO } from '#stage/domain/constants/stage.constants'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'
import { ScheduleNextMediaUseCase } from './ScheduleNextMedia.use-case'
import { ScheduleMediaTransitionUseCase } from './ScheduleMediaTransition.use-case'

/**
 * StartSchedule Use Case
 * Starts the schedule by getting next stage from queue, getting first media, starting playback
 * Scene change happens via cronjob (CHANGE_MEDIA_FOCUS_AND_STAGE)
 */
@Injectable()
export class StartScheduleUseCase {
  private readonly logger = new Logger(StartScheduleUseCase.name)

  constructor(
    private readonly obsService: OBSService,
    private readonly sceneItemsService: SceneItemsService,
    private readonly sourcesService: SourcesService,
    private readonly obsPriorityQueueService: OBSPriorityQueueService,
    private readonly scheduleNextMediaUseCase: ScheduleNextMediaUseCase,
    private readonly scheduleMediaTransitionUseCase: ScheduleMediaTransitionUseCase
  ) {}

  /**
   * Execute the start schedule use case
   * @param schedule Current schedule
   * @param _stages Array of all stages (not used - kept for interface compatibility)
   * @returns The stage that started playing, or null if unable to start
   */
  async execute(schedule: Schedule, _stages: Stage[]): Promise<Stage | null> {
    this.logger.log('Starting schedule...')

    try {
      // Check if schedule has media
      if (MediaSchedulerService.isScheduleToPlayEmpty(schedule)) {
        this.logger.warn('Schedule is empty, cannot start')
        return null
      }

      let stage: Stage | undefined

      if (!StageManagerService.isStageQueueEmpty()) {
        stage = StageManagerService.popNextStageInQueue()
      } else {
        this.logger.error('Cannot start schedule - no stages in queue (no media has been rendered yet)')
        return null
      }

      if (!stage) {
        this.logger.warn('No stage available to start schedule')
        return null
      }

      let firstMedia: ITVShowMediaDTO | undefined
      if (!stage.isQueueEmpty()) {
        firstMedia = stage.peekQueue()
        const shiftedFromSchedule = MediaSchedulerService.shiftSchedule(schedule)
        const shiftedFromStage = stage.shiftQueue()

        if (shiftedFromSchedule?.id !== firstMedia.id || shiftedFromStage?.id !== firstMedia.id) {
          this.logger.warn(
            `Data integrity check failed: Media mismatch between schedule and stage queue on stage ${stage.stageNumber}`
          )
        }
      } else {
        const peekedMedia = MediaSchedulerService.peekNextFromSchedule(schedule, 1)
        if (peekedMedia.length === 0) {
          this.logger.warn('No media available in schedule')
          return null
        }
        firstMedia = peekedMedia[0]
        const shiftedFromSchedule = MediaSchedulerService.shiftSchedule(schedule)

        if (shiftedFromSchedule?.id !== firstMedia.id) {
          this.logger.warn(
            `Data integrity check failed: Peeked media (${firstMedia.id}) doesn't match shifted media (${shiftedFromSchedule?.id})`
          )
        }
      }

      if (!firstMedia) {
        this.logger.warn('No media available to start')
        return null
      }

      this.logger.log(`Starting media: ${firstMedia.title} on stage ${stage.stageNumber}`)

      const stageName = `stage_0${stage.stageNumber}`
      const obsSources = MediaFormatterService.formatMediaForObs([firstMedia], stageName)

      // Convert to SourcesService format for batch creation
      const sourceConfigs = obsSources.map((source) => ({
        sourceName: source.sourceName,
        sourceKind: source.sourceType,
        sceneName: stageName,
        sourceSettings: source.sourceSettings,
        setVisible: false, // Will be made visible by cronjob
      }))

      // Create sources via OBSPQ
      this.obsPriorityQueueService.pushToQueue(OBSMethodType.BATCH_MEDIUM_CREATE_SOURCE, async () => {
        await this.sourcesService.batchCreate(sourceConfigs)
      })

      const activeSource = obsSources[0]

      // Hide other sources via OBSPQ
      this.hideOtherSourcesInScene(stageName, activeSource.sourceName)

      // Set media properties via OBSPQ
      this.obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_MEDIA_PROPERTIES, async () => {
        await this.setMediaSourceProperties(activeSource, stageName)
      })

      StageManagerService.setStageInUse(stage, [firstMedia])

      schedule.markAsStarted()

      MediaSchedulerService.updateLastScheduled(schedule, firstMedia.id || '', firstMedia)

      // Schedule the next media transition (show media and change stage)
      const startTime = 10 // Default start time in seconds
      await this.scheduleMediaTransitionUseCase.execute({
        sourceName: activeSource.sourceName,
        stageName,
        stageNumber: stage.stageNumber,
        delaySeconds: startTime,
        stages: _stages,
      })

      // Schedule the next media cronjob
      await this.scheduleNextMediaUseCase.execute({
        schedule,
        currentStage: stage,
        stages: _stages,
        mediaDuration: firstMedia.duration || 0,
        startTime,
        calibration: 5, // Start schedule lag calibration
      })

      this.logger.log(`Schedule started on stage ${stage.stageNumber}`)
      return stage
    } catch (error) {
      this.logger.error('Error starting schedule', error)
      throw error
    }
  }

  /**
   * Start media playback in OBS
   * @param stage Stage to start playback on
   * @param sourceName Source name (formatted by MediaFormatterService)
   */
  private async startMediaPlayback(stage: Stage, sourceName: string): Promise<void> {
    const obs = await this.obsService.getSocket()
    const stageName = `stage_0${stage.stageNumber}`

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
   * Hide all other media sources in the scene except the active one
   * This ensures only one source is visible and playing at a time
   * Uses OBSPQ for hiding operations
   */
  private hideOtherSourcesInScene(stageName: string, activeSourceName: string): void {
    // Get scene items (read operation - OK to be direct)
    this.obsService
      .getSocket()
      .then(async (obs) => {
        const sceneItemList = await obs.call('GetSceneItemList', { sceneName: stageName })
        const allSources = sceneItemList.sceneItems || []

        // Hide all vlc_source sources except the active one via OBSPQ
        for (const item of allSources) {
          const sourceName = item.sourceName as string
          const inputKind = item.inputKind as string
          if (sourceName !== activeSourceName && inputKind === 'vlc_source') {
            this.obsPriorityQueueService.pushToQueue(OBSMethodType.HIDE_MEDIA, async () => {
              await this.sceneItemsService.setProperties(sourceName, { visible: false }, stageName)
              this.logger.log(`Hidden source: ${sourceName} in ${stageName}`)
            })
          }
        }
      })
      .catch((error) => {
        this.logger.warn('Error getting scene items for hiding', error)
        // Continue even if getting scene items fails
      })
  }

  /**
   * Set properties for media sources (position, scale, visibility, bounds)
   * This ensures media is properly rendered, stretched, and centered in the scene
   */
  private async setMediaSourceProperties(source: any, stageName: string): Promise<void> {
    try {
      if (!source.metadata) {
        this.logger.warn(`Source ${source.sourceName} missing metadata, skipping property setup`)
        return
      }

      await this.sceneItemsService.setProperties(
        source.sourceName,
        {
          visible: false, // Keep hidden - cronjob will make it visible
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

      this.logger.log(`Set properties for source: ${source.sourceName} in ${stageName}`)
    } catch (error) {
      this.logger.warn(`Error setting properties for source ${source.sourceName}`, error)
      throw error
    }
  }
}
