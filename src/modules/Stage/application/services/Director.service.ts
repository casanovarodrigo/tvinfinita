import { Injectable, Logger } from '@nestjs/common'
import { PrepareStreamUseCase } from '../use-cases/PrepareStream.use-case'
import { RenderNextScheduledMediaUseCase } from '../use-cases/RenderNextScheduledMedia.use-case'
import { StartScheduleUseCase } from '../use-cases/StartSchedule.use-case'
import { NextMediaUseCase } from '../use-cases/NextMedia.use-case'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'

/**
 * Director Orchestration Service
 * Coordinates use cases and manages state for media staging
 */
@Injectable()
export class DirectorService {
  private readonly logger = new Logger(DirectorService.name)

  // State management
  private currentSchedule: Schedule | null = null
  private stages: Stage[] = []
  private currentStage: Stage | null = null
  private isStreaming = false

  constructor(
    private readonly prepareStreamUseCase: PrepareStreamUseCase,
    private readonly renderNextScheduledMediaUseCase: RenderNextScheduledMediaUseCase,
    private readonly startScheduleUseCase: StartScheduleUseCase,
    private readonly nextMediaUseCase: NextMediaUseCase
  ) {}

  /**
   * Initialize the director service
   * Prepares stream, initializes stages, and sets up OBS
   */
  async initialize(): Promise<void> {
    this.logger.log('Initializing Director service...')

    try {
      // Prepare stream (stop cron jobs, render scenes, initialize stages)
      await this.prepareStreamUseCase.execute()

      // Initialize stages
      this.stages = StageManagerService.initializeStages()

      this.logger.log('Director service initialized successfully')
    } catch (error) {
      this.logger.error('Error initializing Director service', error)
      throw error
    }
  }

  /**
   * Start streaming with a schedule
   * @param schedule Schedule to start
   */
  async startStreaming(schedule: Schedule): Promise<void> {
    this.logger.log('Starting stream...')

    if (this.isStreaming) {
      this.logger.warn('Stream is already running')
      return
    }

    try {
      this.currentSchedule = schedule

      // Start the schedule
      const startedStage = await this.startScheduleUseCase.execute(schedule, this.stages)

      if (startedStage) {
        this.currentStage = startedStage
        this.isStreaming = true
        this.logger.log(`Stream started on stage ${startedStage.stageNumber}`)
      } else {
        throw new Error('Failed to start schedule - no available stage or media')
      }
    } catch (error) {
      this.logger.error('Error starting stream', error)
      throw error
    }
  }

  /**
   * Start schedule (assumes schedule is already set and media is already rendered)
   * This is used after renderNextMedia has been called
   */
  async startSchedule(): Promise<void> {
    if (!this.currentSchedule) {
      throw new Error('No schedule available to start')
    }

    if (this.isStreaming) {
      this.logger.warn('Stream is already running')
      return
    }

    try {
      const startedStage = await this.startScheduleUseCase.execute(this.currentSchedule, this.stages)

      if (startedStage) {
        this.currentStage = startedStage
        this.isStreaming = true
        this.logger.log(`Schedule started on stage ${startedStage.stageNumber}`)
      } else {
        throw new Error('Failed to start schedule - no available stage or media')
      }
    } catch (error) {
      this.logger.error('Error starting schedule', error)
      throw error
    }
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    this.logger.log('Stopping stream...')

    if (!this.isStreaming) {
      this.logger.warn('Stream is not running')
      return
    }

    try {
      // Vacate current stage
      if (this.currentStage) {
        StageManagerService.vacateStage(this.currentStage)
        this.currentStage = null
      }

      // Clear stage queue
      StageManagerService.clearStageQueue()

      this.isStreaming = false
      this.currentSchedule = null

      this.logger.log('Stream stopped')
    } catch (error) {
      this.logger.error('Error stopping stream', error)
      throw error
    }
  }

  /**
   * Move to next media
   * Handles transition to next media in schedule
   */
  async nextMedia(): Promise<{ success: boolean; hasMoreMedia: boolean }> {
    if (!this.isStreaming || !this.currentSchedule || !this.currentStage) {
      this.logger.warn('Cannot move to next media - stream not active')
      return { success: false, hasMoreMedia: false }
    }

    try {
      const result = await this.nextMediaUseCase.execute(this.currentSchedule, this.currentStage, this.stages)

      if (result.nextStage) {
        this.currentStage = result.nextStage
        this.logger.log(`Moved to next media on stage ${result.nextStage.stageNumber}`)
      } else if (!result.hasMoreMedia) {
        // No more media, stop streaming
        await this.stopStreaming()
      }

      return { success: true, hasMoreMedia: result.hasMoreMedia }
    } catch (error) {
      this.logger.error('Error moving to next media', error)
      return { success: false, hasMoreMedia: false }
    }
  }

  /**
   * Render next scheduled media on an available stage
   * Prepares media for playback without starting it
   */
  async renderNextMedia(): Promise<Stage | null> {
    if (!this.currentSchedule) {
      this.logger.warn('No active schedule to render media from')
      return null
    }

    try {
      const stage = await this.renderNextScheduledMediaUseCase.execute(this.currentSchedule, this.stages)

      if (stage) {
        this.logger.log(`Rendered next media on stage ${stage.stageNumber}`)
      }

      return stage
    } catch (error) {
      this.logger.error('Error rendering next media', error)
      return null
    }
  }

  /**
   * Get current state
   */
  getState(): {
    isStreaming: boolean
    currentStage: Stage | null
    stages: Stage[]
    hasSchedule: boolean
    scheduleHasMedia: boolean
  } {
    return {
      isStreaming: this.isStreaming,
      currentStage: this.currentStage,
      stages: [...this.stages],
      hasSchedule: this.currentSchedule !== null,
      scheduleHasMedia:
        this.currentSchedule !== null && !MediaSchedulerService.isScheduleToPlayEmpty(this.currentSchedule),
    }
  }

  /**
   * Get current schedule
   */
  getCurrentSchedule(): Schedule | null {
    return this.currentSchedule
  }

  /**
   * Set current schedule
   */
  setCurrentSchedule(schedule: Schedule): void {
    this.currentSchedule = schedule
    this.logger.log('Current schedule updated')
  }

  /**
   * Get all stages
   */
  getStages(): Stage[] {
    return [...this.stages]
  }

  /**
   * Get current stage
   */
  getCurrentStage(): Stage | null {
    return this.currentStage
  }
}
