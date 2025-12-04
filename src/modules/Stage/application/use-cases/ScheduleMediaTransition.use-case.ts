import { Injectable } from '@nestjs/common'
import { CronJobSchedulerService } from '#stage/infra/services/CronJobScheduler.service'
import { MediaTransitionUseCase } from './MediaTransition.use-case'
import { Logger } from '@nestjs/common'
import { Stage } from '#stage/domain/entities/Stage'

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
  private readonly logger = new Logger(ScheduleMediaTransitionUseCase.name)

  constructor(
    private readonly cronJobSchedulerService: CronJobSchedulerService,
    private readonly mediaTransitionUseCase: MediaTransitionUseCase
  ) {}

  /**
   * Execute the schedule media transition use case
   * @param dto Transition scheduling data
   */
  async execute(dto: IScheduleMediaTransitionDTO): Promise<void> {
    const { sourceName, stageName, stageNumber, delaySeconds, stages } = dto

    this.logger.log('Scheduling media transition cronjob', {
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
          this.logger.log(`Cronjob ${CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB} executing - will show media and change scene`, {
            sourceName,
            stageName,
            stageNumber,
          })
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
      this.logger.log('Media transition cronjob scheduled successfully', {
        delaySeconds,
        nextExecution: nextExecution.toISOString(),
        sourceName,
        stageName,
        stageNumber,
        jobCreated: !!job,
      })
    } catch (error) {
      this.logger.error('Error scheduling media transition cronjob', {
        error: error.message,
        stack: error.stack,
        dto,
      })
      throw error
    }
  }
}
