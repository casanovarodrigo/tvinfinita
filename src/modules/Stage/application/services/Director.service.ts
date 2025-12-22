import { Injectable } from '@nestjs/common'
import { PrepareStreamUseCase } from '../use-cases/PrepareStream.use-case'
import { RenderNextScheduledMediaUseCase } from '../use-cases/RenderNextScheduledMedia.use-case'
import { StartScheduleUseCase } from '../use-cases/StartSchedule.use-case'
import { NextMediaUseCase } from '../use-cases/NextMedia.use-case'
import { StageManagerService } from '#stage/domain/services/StageManager.service'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'
import { Schedule } from '#mediaCatalog/domain/entities/Schedule'
import { Stage } from '#stage/domain/entities/Stage'
import * as winston from 'winston'
import { LoggerService } from '../../../../infra/logging/services/logger.service'

/**
 * Director Orchestration Service
 * Coordinates use cases and manages state for media staging
 */
@Injectable()
export class DirectorService {
  private readonly logger: winston.Logger

  constructor(
    private readonly prepareStreamUseCase: PrepareStreamUseCase,
    private readonly renderNextScheduledMediaUseCase: RenderNextScheduledMediaUseCase,
    private readonly startScheduleUseCase: StartScheduleUseCase,
    private readonly nextMediaUseCase: NextMediaUseCase,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getDirectorLogger(DirectorService.name)
  }

  // State management
  private schedulesMap: Map<string, Schedule> = new Map()
  private currentScheduleId: string | null = null
  private stages: Stage[] = []
  private currentStage: Stage | null = null
  private isStreaming = false

  /**
   * Initialize the director service
   * Prepares stream, initializes stages, and sets up OBS
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Director service...')

    try {
      // Prepare stream (stop cron jobs, render scenes, initialize stages)
      await this.prepareStreamUseCase.execute()

      // Initialize stages
      this.stages = StageManagerService.initializeStages()

      this.logger.info('Director service initialized successfully')
    } catch (error) {
      this.logger.error('Error initializing Director service', { error })
      throw error
    }
  }

  /**
   * Start streaming with a schedule
   * @param schedule Schedule to start
   */
  async startStreaming(schedule: Schedule): Promise<void> {
    this.logger.info('Starting stream...')

    if (this.isStreaming) {
      this.logger.warn('Stream is already running')
      return
    }

    try {
      // Store schedule in map and set as current
      this.setCurrentSchedule(schedule)

      // Start the schedule
      const startedStage = await this.startScheduleUseCase.execute(schedule, this.stages)

      if (startedStage) {
        this.currentStage = startedStage
        this.isStreaming = true
        // currentScheduleId is already set by setCurrentSchedule()
        this.logger.info(`Stream started on stage ${startedStage.stageNumber}`)
      } else {
        throw new Error('Failed to start schedule - no available stage or media')
      }
    } catch (error) {
      this.logger.error('Error starting stream', { error })
      throw error
    }
  }

  /**
   * Start schedule (assumes schedule is already set and media is already rendered)
   * This is used after renderNextMedia has been called
   */
  async startSchedule(): Promise<void> {
    const currentSchedule = this.getCurrentSchedule()
    if (!currentSchedule) {
      throw new Error('No schedule available to start')
    }

    if (this.isStreaming) {
      this.logger.warn('Stream is already running')
      return
    }

    try {
      const startedStage = await this.startScheduleUseCase.execute(currentSchedule, this.stages)

      if (startedStage) {
        this.currentStage = startedStage
        this.isStreaming = true
        // Ensure currentScheduleId is set (should already be set, but ensure it)
        if (!this.currentScheduleId) {
          this.currentScheduleId = currentSchedule.id.value
        }
        this.logger.info(`Schedule started on stage ${startedStage.stageNumber}`)
      } else {
        throw new Error('Failed to start schedule - no available stage or media')
      }
    } catch (error) {
      this.logger.error('Error starting schedule', { error })
      throw error
    }
  }

  /**
   * Stop streaming
   */
  async stopStreaming(): Promise<void> {
    this.logger.info('Stopping stream...')

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
      // Clear current schedule ID (schedules remain in map for history)
      this.currentScheduleId = null

      this.logger.info('Stream stopped')
    } catch (error) {
      this.logger.error('Error stopping stream', { error })
      throw error
    }
  }

  /**
   * Move to next media
   * Handles transition to next media in schedule
   */
  async nextMedia(): Promise<{ success: boolean; hasMoreMedia: boolean }> {
    const currentSchedule = this.getCurrentSchedule()
    if (!this.isStreaming || !currentSchedule || !this.currentStage) {
      this.logger.warn('Cannot move to next media - stream not active')
      return { success: false, hasMoreMedia: false }
    }

    try {
      const result = await this.nextMediaUseCase.execute(currentSchedule, this.currentStage, this.stages)

      if (result.nextStage) {
        this.currentStage = result.nextStage
        this.logger.info(`Moved to next media on stage ${result.nextStage.stageNumber}`)
      } else if (!result.hasMoreMedia) {
        // No more media, stop streaming
        await this.stopStreaming()
      }

      return { success: true, hasMoreMedia: result.hasMoreMedia }
    } catch (error) {
      this.logger.error('Error moving to next media', { error })
      return { success: false, hasMoreMedia: false }
    }
  }

  /**
   * Render next scheduled media on an available stage
   * Prepares media for playback without starting it
   */
  async renderNextMedia(): Promise<Stage | null> {
    const currentSchedule = this.getCurrentSchedule()
    if (!currentSchedule) {
      this.logger.warn('No active schedule to render media from')
      return null
    }

    try {
      const stage = await this.renderNextScheduledMediaUseCase.execute(currentSchedule, this.stages)

      if (stage) {
        this.logger.info(`Rendered next media on stage ${stage.stageNumber}`)
      }

      return stage
    } catch (error) {
      this.logger.error('Error rendering next media', { error })
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
    const currentSchedule = this.getCurrentSchedule()
    return {
      isStreaming: this.isStreaming,
      currentStage: this.currentStage,
      stages: [...this.stages],
      hasSchedule: currentSchedule !== null,
      scheduleHasMedia:
        currentSchedule !== null && !MediaSchedulerService.isScheduleToPlayEmpty(currentSchedule),
    }
  }

  /**
   * Get current schedule (the one currently playing in OBS)
   */
  getCurrentSchedule(): Schedule | null {
    if (!this.currentScheduleId) {
      return null
    }
    return this.schedulesMap.get(this.currentScheduleId) ?? null
  }

  /**
   * Set current schedule
   * Stores schedule in map and sets it as the active schedule
   */
  setCurrentSchedule(schedule: Schedule): void {
    this.schedulesMap.set(schedule.id.value, schedule)
    this.currentScheduleId = schedule.id.value
    this.logger.info('Current schedule updated')
  }

  /**
   * Get schedule by ID
   * @param id Schedule ID
   * @returns Schedule or null if not found
   */
  getScheduleById(id: string): Schedule | null {
    return this.schedulesMap.get(id) ?? null
  }

  // TODO: Future - addSchedule(schedule: Schedule) method to store schedule in map without setting as current

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
