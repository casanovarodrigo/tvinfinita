import { Injectable } from '@nestjs/common'
import { RenderBaseScenesUseCase } from './RenderBaseScenes.use-case'
import { StopScheduleCronjobsUseCase } from './StopScheduleCronjobs.use-case'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { Logger } from '@nestjs/common'
import { OBSPriorityQueueService, OBSMethodType } from '#stage/infra/services/OBS/OBSPriorityQueue.service'
import { SceneService } from '#stage/infra/services/OBS/Scene.service'
import { STARTING_STREAM_SCENE } from '#stage/domain/constants/stage.constants'

/**
 * PrepareStream Use Case
 * Prepares the stream by stopping existing jobs, rendering base scenes, and initializing stages
 */
@Injectable()
export class PrepareStreamUseCase {
  private readonly logger = new Logger(PrepareStreamUseCase.name)

  constructor(
    private readonly renderBaseScenesUseCase: RenderBaseScenesUseCase,
    private readonly stopScheduleCronjobsUseCase: StopScheduleCronjobsUseCase,
    private readonly obsPriorityQueueService: OBSPriorityQueueService,
    private readonly sceneService: SceneService
  ) {}

  /**
   * Execute the prepare stream use case
   * @param options Optional configuration
   */
  async execute(options?: { stopCronJobs?: boolean }): Promise<void> {
    this.logger.log('Preparing stream...')

    try {
      // Stop existing cron jobs if requested
      if (options?.stopCronJobs !== false) {
        await this.stopExistingCronJobs()
      }

      // Render base scenes (starting-stream, technical-break, offline, stage scenes)
      await this.renderBaseScenesUseCase.execute()

      // Initialize stages (1-4) as available
      const stages = StageManagerService.initializeStages()
      this.logger.log(`Initialized ${stages.length} stages`)

      // Change to starting-stream scene (will remain until cronjob starts the schedule)
      this.obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_SYS_STAGE_FOCUS, async () => {
        await this.sceneService.setScene(STARTING_STREAM_SCENE)
        this.logger.log(`Changed to ${STARTING_STREAM_SCENE} scene`)
      })

      this.logger.log('Stream preparation completed')
    } catch (error) {
      this.logger.error('Error preparing stream', error)
      throw error
    }
  }

  /**
   * Stop existing cron jobs
   */
  private async stopExistingCronJobs(): Promise<void> {
    this.logger.log('Stopping existing cron jobs...')
    await this.stopScheduleCronjobsUseCase.execute()
  }
}
