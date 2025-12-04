import { Injectable } from '@nestjs/common'
import { CronJobSchedulerService } from '#stage/infra/services/CronJobScheduler.service'
import * as winston from 'winston'
import { LoggerService } from '../../../../infra/logging/services/logger.service'

const NEXT_SCHEDULED_MEDIA_CRONJOB = 'next_scheduled_media'
const CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB = 'change_media_focus_and_stage'

/**
 * StopScheduleCronjobsUseCase
 * Stops all schedule-related cronjobs
 * Used when schedule is stopped or paused
 */
@Injectable()
export class StopScheduleCronjobsUseCase {
  private readonly logger: winston.Logger

  constructor(
    private readonly cronJobSchedulerService: CronJobSchedulerService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getCronjobLogger(StopScheduleCronjobsUseCase.name)
  }

  /**
   * Execute the stop schedule cronjobs use case
   */
  async execute(): Promise<void> {
    this.logger.info('Stopping all schedule cronjobs')

    try {
      const jobsToStop = [NEXT_SCHEDULED_MEDIA_CRONJOB, CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB]

      const results = jobsToStop.map((jobName) => {
        const stopped = this.cronJobSchedulerService.destroyJob(jobName)
        return { jobName, stopped }
      })

      const stoppedCount = results.filter((r) => r.stopped).length

      this.logger.info('Schedule cronjobs stopped', {
        total: jobsToStop.length,
        stopped: stoppedCount,
        results,
      })
    } catch (error) {
      this.logger.error('Error stopping schedule cronjobs', { error })
      throw error
    }
  }
}
