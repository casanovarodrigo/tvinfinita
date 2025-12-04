import { Injectable } from '@nestjs/common'
import { RenderBaseScenesUseCase } from './RenderBaseScenes.use-case'
import { StopScheduleCronjobsUseCase } from './StopScheduleCronjobs.use-case'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { OBSPriorityQueueService, OBSMethodType } from '#stage/infra/services/OBS/OBSPriorityQueue.service'
import { SceneService } from '#stage/infra/services/OBS/Scene.service'
import { STARTING_STREAM_SCENE } from '#stage/domain/constants/stage.constants'
import * as winston from 'winston'
import { LoggerService } from '../../../../infra/logging/services/logger.service'

/**
 * PrepareStream Use Case
 * Prepares the stream by stopping existing jobs, rendering base scenes, and initializing stages
 */
@Injectable()
export class PrepareStreamUseCase {
  private readonly logger: winston.Logger

  constructor(
    private readonly renderBaseScenesUseCase: RenderBaseScenesUseCase,
    private readonly stopScheduleCronjobsUseCase: StopScheduleCronjobsUseCase,
    private readonly obsPriorityQueueService: OBSPriorityQueueService,
    private readonly sceneService: SceneService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getDirectorLogger(PrepareStreamUseCase.name)
  }

  /**
   * Execute the prepare stream use case
   * @param options Optional configuration
   */
  async execute(options?: { stopCronJobs?: boolean }): Promise<void> {
    this.logger.info('Preparing stream...')

    try {
      // Stop existing cron jobs if requested
      if (options?.stopCronJobs !== false) {
        await this.stopExistingCronJobs()
      }

      // Render base scenes (starting-stream, technical-break, offline, stage scenes)
      await this.renderBaseScenesUseCase.execute()

      // Initialize stages (1-4) as available
      const stages = StageManagerService.initializeStages()
      this.logger.info(`Initialized ${stages.length} stages`)

      // Change to starting-stream scene (will remain until cronjob starts the schedule)
      this.obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_SYS_STAGE_FOCUS, async () => {
        await this.sceneService.setScene(STARTING_STREAM_SCENE)
        this.logger.info(`Changed to ${STARTING_STREAM_SCENE} scene`)
      })

      this.logger.info('Stream preparation completed')
    } catch (error) {
      this.logger.error('Error preparing stream', { error })
      throw error
    }
  }

  /**
   * Stop existing cron jobs
   */
  private async stopExistingCronJobs(): Promise<void> {
    this.logger.info('Stopping existing cron jobs...')
    await this.stopScheduleCronjobsUseCase.execute()
  }
}
