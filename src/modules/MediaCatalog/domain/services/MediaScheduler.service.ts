import { Schedule } from '../entities/Schedule'
import { IScheduleOptions, IScheduleDTO, MediaQueue } from '../entities/Schedule/interfaces'
import { ITVShowMediaDTO } from '../entities/TVShowMedia/interfaces'
import { SimpleStrategy } from './strategies/SimpleStrategy'

/**
 * MediaScheduler Domain Service
 * Manages schedule generation and manipulation
 */
export class MediaSchedulerService {
  /**
   * Create a new schedule using the simple strategy
   * @param options Schedule options
   * @returns Created schedule
   */
  public static createSchedule(options: IScheduleOptions): Schedule {
    // Use SimpleStrategy for now (other strategies deferred)
    const result = SimpleStrategy.generate(options)

    const scheduleDTO: IScheduleDTO = {
      preStart: [],
      toPlay: result.toPlay,
      lastScheduledFromTitle: result.lastScheduledFromTitle,
      unstarted: true,
    }

    return Schedule.create(scheduleDTO)
  }

  /**
   * Peek at the next items from the schedule without removing them
   * @param schedule Schedule to peek from
   * @param itemCount Number of items to peek
   * @returns Array of media items
   */
  public static peekNextFromSchedule(schedule: Schedule, itemCount: number = 1): MediaQueue {
    return schedule.peekToPlay(itemCount)
  }

  /**
   * Shift (remove and return) the next item from the schedule
   * @param schedule Schedule to shift from
   * @returns Next media item or undefined if empty
   */
  public static shiftSchedule(schedule: Schedule): ITVShowMediaDTO | undefined {
    return schedule.shiftToPlay()
  }

  /**
   * Check if the schedule's toPlay queue is empty
   * @param schedule Schedule to check
   * @returns True if empty, false otherwise
   */
  public static isScheduleToPlayEmpty(schedule: Schedule): boolean {
    return schedule.isToPlayEmpty()
  }

  /**
   * Update the last scheduled media for a title
   * @param schedule Schedule to update
   * @param titleId Title ID
   * @param media Media that was scheduled
   */
  public static updateLastScheduled(schedule: Schedule, titleId: string, media: ITVShowMediaDTO): void {
    schedule.updateLastScheduled(titleId, media)
  }

  /**
   * Get the last scheduled media for a title
   * @param schedule Schedule to query
   * @param titleId Title ID
   * @returns Last scheduled media or undefined
   */
  public static getLastScheduled(schedule: Schedule, titleId: string): ITVShowMediaDTO | undefined {
    return schedule.getLastScheduled(titleId)
  }
}
