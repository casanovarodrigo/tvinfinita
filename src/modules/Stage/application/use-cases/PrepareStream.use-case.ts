import { Injectable } from '@nestjs/common'
import { RenderBaseScenesUseCase } from './RenderBaseScenes.use-case'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { Logger } from '@nestjs/common'

/**
 * PrepareStream Use Case
 * Prepares the stream by stopping existing jobs, rendering base scenes, and initializing stages
 */
@Injectable()
export class PrepareStreamUseCase {
  private readonly logger = new Logger(PrepareStreamUseCase.name)

  constructor(private readonly renderBaseScenesUseCase: RenderBaseScenesUseCase) {}

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

      this.logger.log('Stream preparation completed')
    } catch (error) {
      this.logger.error('Error preparing stream', error)
      throw error
    }
  }

  /**
   * Stop existing cron jobs
   * TODO: Implement cron job management when scheduler is added
   */
  private async stopExistingCronJobs(): Promise<void> {
    this.logger.log('Stopping existing cron jobs...')
    // Placeholder for future cron job management
    // This will be implemented when the scheduler system is added
  }
}

