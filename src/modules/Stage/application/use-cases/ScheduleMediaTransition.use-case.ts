import { Injectable } from '@nestjs/common'
import { CronJobSchedulerService } from '#stage/infra/services/CronJobScheduler.service'
import { MediaTransitionUseCase } from './MediaTransition.use-case'
import { Stage } from '#stage/domain/entities/Stage'
import * as winston from 'winston'
import { LoggerService } from '../../../../infra/logging/services/logger.service'

export interface IScheduleMediaTransitionDTO {
  sourceName: string
  stageName: string
  stageNumber: number
  delaySeconds: number
  stages: Stage[]
}

const CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB = 'change_media_focus_and_stage'

/**
 * ScheduleMediaTransitionUseCase
 * Creates the change_media_focus_and_stage cronjob
 */
@Injectable()
export class ScheduleMediaTransitionUseCase {
  private readonly logger: winston.Logger

  constructor(
    private readonly cronJobSchedulerService: CronJobSchedulerService,
    private readonly mediaTransitionUseCase: MediaTransitionUseCase,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getCronjobLogger(ScheduleMediaTransitionUseCase.name)
  }

  /**
   * Execute the schedule media transition use case
   * @param dto Transition scheduling data
   */
  async execute(dto: IScheduleMediaTransitionDTO): Promise<void> {
    const { sourceName, stageName, stageNumber, delaySeconds, stages } = dto

    this.logger.info('Scheduling media transition cronjob', {
      sourceName,
      stageName,
      stageNumber,
      delaySeconds,
    })

    try {
      const job = this.cronJobSchedulerService.createJob({
        name: CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB,
        type: 'media',
        timeInSeconds: delaySeconds,
        callback: async () => {
          this.logger.info(
            `Cronjob ${CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB} executing - will show media and change scene`,
            {
              sourceName,
              stageName,
              stageNumber,
            }
          )
          await this.mediaTransitionUseCase.execute(
            {
              sourceName,
              stageName,
              stageNumber,
            },
            stages
          )
        },
        startAtCreation: true,
        context: this,
      })

      const nextExecution = new Date(Date.now() + delaySeconds * 1000)
      this.logger.info('Media transition cronjob scheduled successfully', {
        delaySeconds,
        nextExecution: nextExecution.toISOString(),
        sourceName,
        stageName,
        stageNumber,
        jobCreated: !!job,
      })
    } catch (error) {
      this.logger.error('Error scheduling media transition cronjob', { error, dto })
      throw error
    }
  }
}
