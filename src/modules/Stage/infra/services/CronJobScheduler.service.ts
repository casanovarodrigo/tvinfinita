import { Injectable } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { LoggerService } from '../../../../infra/logging/services/logger.service'

export interface ICronJobMetadata {
  name: string
  type: string
  nextExecution: Date | null
  lastExecution: Date | null
  isRunning: boolean
  cronTime: string | Date
}

export interface ICreateJobOptions {
  name: string
  type: string
  timeInSeconds?: number
  cronTime?: string
  callback: () => void | Promise<void>
  afterCallback?: () => void | Promise<void>
  startAtCreation?: boolean
  context?: any
  params?: any
}

/**
 * Unique job names that should only have one instance at a time
 * If a new job with the same name is created, the old one is stopped and replaced
 */
const UNIQUE_JOBS = [
  'next_scheduled_media',
  'preference_media_poll_checker',
  'OBS_PQ_Retry',
  'change_media_focus_and_stage',
  'media_timespan_update',
]

/**
 * CronJobSchedulerService - Infrastructure service for managing cronjobs
 * Wraps @nestjs/schedule SchedulerRegistry to provide job lifecycle management
 */
@Injectable()
export class CronJobSchedulerService {
  private readonly loggerCronjob
  private readonly timezone = 'America/Sao_Paulo'
  private readonly cronjobTestRatio = process.env.NODE_ENV === 'development' ? 18 : 1
  private jobMetadata: Map<string, ICronJobMetadata> = new Map()

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly loggerService: LoggerService
  ) {
    this.loggerCronjob = this.loggerService.getCronjobLogger(CronJobSchedulerService.name)
    this.loggerCronjob.info('CronJobSchedulerService initialized')
  }

  /**
   * Validates cron time syntax
   * @param time Cron time string
   * @returns true if valid, false otherwise
   */
  private isValidTime(time: string): boolean {
    try {
      new CronJob(time, () => {}, null, false, this.timezone)
      return true
    } catch (error) {
      this.loggerCronjob.warn('Invalid cron time syntax', {
        time,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Converts seconds to cron syntax
   * @param timeInSeconds Seconds to add to current time
   * @returns Cron syntax string
   */
  /**
   * Converts seconds to a Date object for one-time execution
   * Cron v4 supports Date objects directly for one-time execution
   * @param timeInSeconds Seconds to add to current time
   * @returns Date object representing when the job should execute
   */
  private secondsToExecutionDate(timeInSeconds: number): Date {
    const now = new Date()
    const minimo = 5
    let sec = timeInSeconds

    // Apply development mode time acceleration
    if (process.env.NODE_ENV === 'development') {
      sec = timeInSeconds / this.cronjobTestRatio < minimo ? minimo : timeInSeconds / this.cronjobTestRatio
    }

    now.setSeconds(now.getSeconds() + sec)
    return now
  }

  /**
   * Creates a new cronjob
   * @param options Job creation options
   * @returns Created CronJob instance
   */
  createJob(options: ICreateJobOptions): CronJob {
    const {
      name,
      type,
      timeInSeconds,
      cronTime,
      callback,
      afterCallback,
      startAtCreation = false,
      context,
      params,
    } = options

    this.loggerCronjob.info('Creating cronjob', {
      name,
      type,
      timeInSeconds,
      cronTime,
      startAtCreation,
    })

    // Check if job is unique and already exists
    const isUnique = UNIQUE_JOBS.includes(name)
    if (isUnique) {
      const existingJob = this.getJob(name)
      if (existingJob) {
        this.loggerCronjob.info('Stopping and replacing unique job', {
          name,
          type,
        })
        this.destroyJob(name)
      }
    }

    // Determine cron time or execution date
    let finalCronTime: string | Date
    if (cronTime) {
      finalCronTime = cronTime
      // Validate cron time string
      if (!this.isValidTime(finalCronTime)) {
        throw new Error(`Invalid cron time syntax: ${finalCronTime}`)
      }
    } else if (timeInSeconds !== undefined) {
      // For one-time execution, use Date object (cron v4 supports this)
      finalCronTime = this.secondsToExecutionDate(timeInSeconds)
    } else {
      throw new Error(`Either cronTime or timeInSeconds must be provided for job ${name}`)
    }

    // Create cronjob using positional parameters (cron v4 doesn't support object format like v1)
    const onTickCallback = async () => {
      const startTime = Date.now()
      this.loggerCronjob.info('Job execution started', {
        name,
        type,
      })

      try {
        // Call callback with params if provided, otherwise call directly
        if (params !== undefined) {
          await (callback as (params: any) => void | Promise<void>)(params)
        } else {
          await callback()
        }

        const duration = Date.now() - startTime
        this.loggerCronjob.info('Job execution completed', {
          name,
          type,
          duration: `${duration}ms`,
        })

        // Update metadata
        this.updateJobMetadata(name, {
          lastExecution: new Date(),
          isRunning: false,
        })

        // Call after callback if provided
        if (afterCallback) {
          await afterCallback()
        }
      } catch (error) {
        const duration = Date.now() - startTime
        this.loggerCronjob.error('Job execution failed', {
          name,
          type,
          duration: `${duration}ms`,
          error: error.message,
          stack: error.stack,
          context: error,
        })
        this.updateJobMetadata(name, {
          lastExecution: new Date(),
          isRunning: false,
        })
      }
    }

    const job = new CronJob(
      finalCronTime,
      onTickCallback,
      afterCallback || null,
      startAtCreation,
      this.timezone,
      context || null
    )

    // Add to scheduler registry
    this.schedulerRegistry.addCronJob(name, job)

    // Explicitly start the job if startAtCreation is true
    // (CronJob constructor should start it, but we ensure it's started)
    if (startAtCreation) {
      job.start()
      this.loggerCronjob.info('Job started explicitly', { name })
    }

    // Update metadata
    let nextExecution: Date | null = null
    try {
      const nextDates = job.nextDates()
      if (Array.isArray(nextDates) && nextDates.length > 0) {
        const firstDate = nextDates[0]
        // Check if it's a Luxon DateTime object with toJSDate method
        if (firstDate && typeof (firstDate as any).toJSDate === 'function') {
          nextExecution = (firstDate as any).toJSDate()
        } else if (firstDate && typeof (firstDate as any).toDate === 'function') {
          // Fallback for other date-like objects
          nextExecution = (firstDate as any).toDate()
        }
      }
    } catch (error) {
      this.loggerCronjob.warn('Could not get next execution date for job', {
        name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    this.updateJobMetadata(name, {
      name,
      type,
      nextExecution,
      lastExecution: null,
      isRunning: (job as any).running || false,
      cronTime: finalCronTime instanceof Date ? finalCronTime.toISOString() : finalCronTime,
    })

    this.loggerCronjob.info('Job created successfully', {
      name,
      type,
      nextExecution: nextExecution ? nextExecution.toISOString() : null,
      startAtCreation,
      isRunning: (job as any).running || false,
      cronTime: finalCronTime,
    })

    return job
  }

  /**
   * Stops a cronjob (keeps it in registry)
   * @param name Job name
   * @returns true if stopped, false if not found
   */
  stopJob(name: string): boolean {
    this.loggerCronjob.info('Stopping job', { name })

    try {
      const job = this.schedulerRegistry.getCronJob(name)
      job.stop()

      this.updateJobMetadata(name, {
        isRunning: (job as any).running || false,
      })

      this.loggerCronjob.info('Job stopped', { name })
      return true
    } catch (error) {
      this.loggerCronjob.warn('Job not found for stopping', {
        name,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Starts a cronjob
   * @param name Job name
   * @returns true if started, false if not found
   */
  startJob(name: string): boolean {
    this.loggerCronjob.info('Starting job', { name })

    try {
      const job = this.schedulerRegistry.getCronJob(name)
      job.start()

      const isRunning = (job as any).running || true
      this.updateJobMetadata(name, {
        isRunning,
      })

      this.loggerCronjob.info('Job started', {
        name,
        isRunning,
      })
      return true
    } catch (error) {
      this.loggerCronjob.warn('Job not found for starting', {
        name,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Destroys a cronjob (stops and removes from registry)
   * @param name Job name
   * @returns true if destroyed, false if not found
   */
  destroyJob(name: string): boolean {
    this.loggerCronjob.info('Destroying job', { name })

    try {
      const job = this.schedulerRegistry.getCronJob(name)
      if ((job as any).running) {
        job.stop()
      }
      this.schedulerRegistry.deleteCronJob(name)
      this.jobMetadata.delete(name)

      this.loggerCronjob.info('Job destroyed', { name })
      return true
    } catch (error) {
      this.loggerCronjob.warn('Job not found for destroying', {
        name,
        error: error.message,
      })
      return false
    }
  }

  /**
   * Gets job metadata by name
   * @param name Job name
   * @returns Job metadata or null if not found
   */
  getJob(name: string): ICronJobMetadata | null {
    try {
      const job = this.schedulerRegistry.getCronJob(name)
      const metadata = this.jobMetadata.get(name)

      if (!metadata) {
        return null
      }

      // Update next execution time
      let nextExecution: Date | null = null
      try {
        const nextDates = job.nextDates()
        if (Array.isArray(nextDates) && nextDates.length > 0) {
          const firstDate = nextDates[0]
          // Check if it's a Luxon DateTime object with toJSDate method
          if (firstDate && typeof (firstDate as any).toJSDate === 'function') {
            nextExecution = (firstDate as any).toJSDate()
          } else if (firstDate && typeof (firstDate as any).toDate === 'function') {
            // Fallback for other date-like objects
            nextExecution = (firstDate as any).toDate()
          }
        }
      } catch {
        // If we can't get next execution date, keep existing value
      }
      const updatedMetadata: ICronJobMetadata = {
        ...metadata,
        nextExecution,
        isRunning: (job as any).running || false,
      }

      this.jobMetadata.set(name, updatedMetadata)
      return updatedMetadata
    } catch {
      return null
    }
  }

  /**
   * Lists all jobs with optional filtering
   * @param runningJobsOnly Optional filter: true = only running, false = only not running, undefined = all
   * @returns Array of job metadata
   */
  listJobs(runningJobsOnly?: boolean): ICronJobMetadata[] {
    this.orderByNextRun()

    let jobs = Array.from(this.jobMetadata.values())

    if (runningJobsOnly === true) {
      jobs = jobs.filter((job) => job.isRunning)
    } else if (runningJobsOnly === false) {
      jobs = jobs.filter((job) => !job.isRunning)
    }

    return jobs
  }

  /**
   * Orders jobs by next execution time
   * @returns Sorted array of job metadata
   */
  orderByNextRun(): ICronJobMetadata[] {
    // Refresh all job metadata
    const allJobNames = Array.from(this.jobMetadata.keys())
    allJobNames.forEach((name) => {
      const metadata = this.getJob(name)
      if (metadata) {
        this.jobMetadata.set(name, metadata)
      }
    })

    // Sort by next execution time
    const sorted = Array.from(this.jobMetadata.values()).sort((a, b) => {
      if (!a.nextExecution) return 1
      if (!b.nextExecution) return -1
      return a.nextExecution.getTime() - b.nextExecution.getTime()
    })

    return sorted
  }

  /**
   * Updates job metadata
   * @param name Job name
   * @param updates Partial metadata updates
   */
  private updateJobMetadata(name: string, updates: Partial<ICronJobMetadata>): void {
    const existing = this.jobMetadata.get(name) || ({} as ICronJobMetadata)
    this.jobMetadata.set(name, { ...existing, ...updates })
  }
}
