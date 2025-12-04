import { Injectable } from '@nestjs/common'
import { CronJobSchedulerService } from '#stage/infra/services/CronJobScheduler.service'
import { NextMediaUseCase } from './NextMedia.use-case'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import * as winston from 'winston'
import { LoggerService } from '../../../../infra/logging/services/logger.service'

export interface IScheduleNextMediaDTO {
  schedule: Schedule
  currentStage: Stage
  stages: Stage[]
  mediaDuration: number // in seconds
  startTime?: number // in seconds, default: 10
  calibration?: number // in seconds, default: 5 for first, 1 for ongoing
}

const NEXT_SCHEDULED_MEDIA_CRONJOB = 'next_scheduled_media'
const DEFAULT_START_TIME = 10
const START_SCHEDULE_LAG_CALIBRATION = 5
const ONGOING_SCHEDULE_LAG_CALIBRATION = 1

/**
 * ScheduleNextMediaUseCase
 * Creates/updates the next_scheduled_media cronjob
 */
@Injectable()
export class ScheduleNextMediaUseCase {
  private readonly logger: winston.Logger

  constructor(
    private readonly cronJobSchedulerService: CronJobSchedulerService,
    private readonly nextMediaUseCase: NextMediaUseCase,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getCronjobLogger(ScheduleNextMediaUseCase.name)
  }

  /**
   * Execute the schedule next media use case
   * @param dto Scheduling data
   */
  async execute(dto: IScheduleNextMediaDTO): Promise<void> {
    const {
      schedule,
      currentStage,
      stages,
      mediaDuration,
      startTime = DEFAULT_START_TIME,
      calibration = START_SCHEDULE_LAG_CALIBRATION,
    } = dto

    // Calculate seconds until next media should play
    const secondsToAdd = mediaDuration + startTime + calibration

    this.logger.info('Scheduling next media cronjob', {
      mediaDuration,
      startTime,
      calibration,
      secondsToAdd,
      stage: currentStage.stageNumber,
    })

    try {
      // Create/update the cronjob
      // The job will call NextMediaUseCase.execute() when it fires
      this.cronJobSchedulerService.createJob({
        name: NEXT_SCHEDULED_MEDIA_CRONJOB,
        type: 'media',
        timeInSeconds: secondsToAdd,
        callback: async () => {
          // Stop the current cronjob first
          this.cronJobSchedulerService.stopJob(NEXT_SCHEDULED_MEDIA_CRONJOB)

          // Execute next media transition
          const result = await this.nextMediaUseCase.execute(schedule, currentStage, stages)

          // If there's more media, schedule the next one
          if (result.hasMoreMedia && result.nextStage) {
            // Get the next media duration from the stage queue
            const nextMedia = result.nextStage.peekQueue()
            if (nextMedia && nextMedia.duration) {
              // Duration is a number in the DTO
              const nextMediaDuration =
                typeof nextMedia.duration === 'number'
                  ? nextMedia.duration
                  : (nextMedia.duration as any).value || 0
              await this.execute({
                schedule,
                currentStage: result.nextStage,
                stages,
                mediaDuration: nextMediaDuration,
                startTime: 0, // No start time for ongoing media
                calibration: ONGOING_SCHEDULE_LAG_CALIBRATION,
              })
            }
          }
        },
        startAtCreation: true,
        context: this,
      })

      this.logger.info('Next media cronjob scheduled successfully', {
        secondsToAdd,
        nextExecution: new Date(Date.now() + secondsToAdd * 1000).toISOString(),
      })
    } catch (error) {
      this.logger.error('Error scheduling next media cronjob', {
        error: error.message,
        stack: error.stack,
        dto,
      })
      throw error
    }
  }
}
