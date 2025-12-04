import { Injectable } from '@nestjs/common'
import { CronJobSchedulerService, ICronJobMetadata } from '#stage/infra/services/CronJobScheduler.service'

export interface IListCronJobsDTO {
  runningJobsOnly?: boolean
}

/**
 * ListCronJobsUseCase
 * Lists all cronjobs with optional filtering by running status
 */
@Injectable()
export class ListCronJobsUseCase {
  constructor(private readonly cronJobSchedulerService: CronJobSchedulerService) {}

  /**
   * Execute the list cronjobs use case
   * @param dto Optional filter options
   * @returns Array of cronjob metadata
   */
  async execute(dto?: IListCronJobsDTO): Promise<ICronJobMetadata[]> {
    const runningJobsOnly = dto?.runningJobsOnly !== undefined ? dto.runningJobsOnly : undefined

    return this.cronJobSchedulerService.listJobs(runningJobsOnly)
  }
}
