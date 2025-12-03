import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { SceneItemsService } from '#stage/infra/services/OBS/SceneItems.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaFormatterService } from '#stage/domain/services/MediaFormatter.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import { Logger } from '@nestjs/common'
import { STAGE_INFO } from '#stage/domain/constants/stage.constants'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

/**
 * StartSchedule Use Case
 * Starts the schedule by getting next stage from queue, getting first media, starting playback, and changing to stage scene
 */
@Injectable()
export class StartScheduleUseCase {
  private readonly logger = new Logger(StartScheduleUseCase.name)

  constructor(
    private readonly obsService: OBSService,
    private readonly sceneItemsService: SceneItemsService
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

      await this.createOBSSources(obsSources, stageName)

      const activeSource = obsSources[0]
      await this.hideOtherSourcesInScene(stageName, activeSource.sourceName)

      await this.setMediaSourceProperties(activeSource, stageName)

      StageManagerService.setStageInUse(stage, [firstMedia])

      await this.startMediaPlayback(stage, activeSource.sourceName)

      await this.changeToStageScene(stage)

      schedule.markAsStarted()

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
   * Hide all other media sources in the scene except the active one
   * This ensures only one source is visible and playing at a time
   */
  private async hideOtherSourcesInScene(stageName: string, activeSourceName: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      const sceneItemList = await obs.call('GetSceneItemList', { sceneName: stageName })
      const allSources = sceneItemList.sceneItems || []

      // Hide all vlc_source sources except the active one
      for (const item of allSources) {
        const sourceName = item.sourceName as string
        const inputKind = item.inputKind as string
        if (sourceName !== activeSourceName && inputKind === 'vlc_source') {
          await this.sceneItemsService.setProperties(sourceName, { visible: false }, stageName)
          this.logger.log(`Hidden source: ${sourceName} in ${stageName}`)
        }
      }
    } catch (error) {
      this.logger.warn('Error hiding other sources in scene', error)
      // Continue even if hiding fails
    }
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
          visible: true,
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
