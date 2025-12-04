import { Injectable } from '@nestjs/common'
import { OBSPriorityQueueService, OBSMethodType } from '#stage/infra/services/OBS/OBSPriorityQueue.service'
import { SceneItemsService } from '#stage/infra/services/OBS/SceneItems.service'
import { SceneService } from '#stage/infra/services/OBS/Scene.service'
import { OBSService } from '#stage/infra/services/OBS.service'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { Stage } from '#stage/domain/entities/Stage'
import { Logger } from '@nestjs/common'

export interface IMediaTransitionDTO {
  sourceName: string
  stageName: string
  stageNumber: number
}

/**
 * MediaTransitionUseCase
 * Handles media visibility and stage transitions
 * Triggered by: change_media_focus_and_stage cronjob
 */
@Injectable()
export class MediaTransitionUseCase {
  private readonly logger = new Logger(MediaTransitionUseCase.name)

  constructor(
    private readonly obsPriorityQueueService: OBSPriorityQueueService,
    private readonly sceneItemsService: SceneItemsService,
    private readonly sceneService: SceneService,
    private readonly obsService: OBSService
  ) {}

  /**
   * Execute the media transition use case
   * @param dto Transition data
   * @param stages Array of all stages (needed to update stage state)
   */
  async execute(dto: IMediaTransitionDTO, stages: Stage[]): Promise<void> {
    const { sourceName, stageName, stageNumber } = dto

    this.logger.log(`Executing media transition: ${sourceName} on stage ${stageNumber}`)

    try {
      this.obsPriorityQueueService.pushToQueue(OBSMethodType.SHOW_MEDIA, async () => {
        try {
          const obs = await this.obsService.getSocket()
          const sceneItemList = await obs.call('GetSceneItemList', { sceneName: stageName })
          const sceneItem = sceneItemList.sceneItems.find((item: any) => item.sourceName === sourceName)

          if (!sceneItem) {
            this.logger.error(`Source ${sourceName} not found in scene ${stageName} - cannot make visible`)
            throw new Error(`Source ${sourceName} not found in scene ${stageName}`)
          }

          await this.sceneItemsService.setProperties(
            sourceName,
            {
              visible: true,
            },
            stageName
          )

          // Update stage state
          const stage = StageManagerService.findStageByNumber(stages, stageNumber)
          if (stage) {
            StageManagerService.setStageOnScreen(stage)
            this.logger.log(`Stage ${stageNumber} set as on screen`)
          }

          this.logger.log(`Set media ${sourceName} visible in ${stageName}`)
        } catch (error) {
          this.logger.error(`Error showing media ${sourceName}`, {
            error: error.message,
            stack: error.stack,
            sourceName,
            stageName,
          })
          throw error
        }
      })

      this.obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_STAGE_FOCUS, async () => {
        try {
          await this.sceneService.setScene(stageName)

          // Update stage state
          const stage = StageManagerService.findStageByNumber(stages, stageNumber)
          if (stage) {
            StageManagerService.setStageOnScreen(stage)
          }

          this.logger.log(`Changed scene to ${stageName} - Stage ${stageNumber} is now on screen`)
        } catch (error) {
          this.logger.error(`Error changing scene to ${stageName}`, {
            error: error.message,
            stack: error.stack,
            stageName,
            stageNumber,
          })
          throw error
        }
      })

      this.logger.log(`Media transition commands queued for ${sourceName} on stage ${stageNumber}`)
    } catch (error) {
      this.logger.error('Error executing media transition', {
        error: error.message,
        stack: error.stack,
        dto,
      })
      throw error
    }
  }
}
