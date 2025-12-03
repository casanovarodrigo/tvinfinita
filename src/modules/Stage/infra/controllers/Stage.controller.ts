import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, Logger } from '@nestjs/common'
import { DirectorService } from '../../application/services/Director.service'
import { OBSService } from '../services/OBS.service'
import { MediaTitleRepository } from '#mediaCatalog/infra/repositories/MediaTitle.repository'
import { MediaSchedulerService } from '#mediaCatalog/domain/services/MediaScheduler.service'

@Controller('api/stage')
export class StageController {
  private readonly logger = new Logger(StageController.name)

  constructor(
    private readonly directorService: DirectorService,
    private readonly obsService: OBSService,
    private readonly mediaTitleRepository: MediaTitleRepository
  ) {}

  /**
   * Check OBS connection status
   * GET /api/stage/obs/status
   */
  @Get('obs/status')
  async getOBSStatus(): Promise<{ connected: boolean; message: string }> {
    const connected = this.obsService.isOBSConnected()
    return {
      connected,
      message: connected ? 'OBS WebSocket is connected' : 'OBS WebSocket is not connected',
    }
  }

  /**
   * Initialize Director service (prepare stream, render scenes, initialize stages)
   * POST /api/stage/initialize
   * Equivalent to: GET /obs/preparestages in legacy
   */
  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      await this.directorService.initialize()
      return {
        success: true,
        message: 'Director service initialized successfully',
      }
    } catch (error) {
      this.logger.error('Failed to initialize Director service', error)
      return {
        success: false,
        message: error.message || 'Failed to initialize Director service',
      }
    }
  }

  /**
   * Create a schedule from a MediaTitle
   * POST /api/stage/create-schedule/:mediaTitleId
   * Body: { timespan?: number } (optional, defaults to 8 hours in seconds)
   * Equivalent to: GET /obs/createschedule in legacy
   */
  @Post('create-schedule/:mediaTitleId')
  @HttpCode(HttpStatus.OK)
  async createSchedule(
    @Param('mediaTitleId') mediaTitleId: string,
    @Body() body?: { timespan?: number }
  ): Promise<{ success: boolean; message: string; schedule?: any }> {
    try {
      // Get MediaTitle from repository
      const mediaTitle = await this.mediaTitleRepository.findById(mediaTitleId)
      if (!mediaTitle) {
        return {
          success: false,
          message: `MediaTitle with ID ${mediaTitleId} not found`,
        }
      }

      // Create schedule using MediaSchedulerService
      const timespan = body?.timespan || 8 * 60 * 60 // Default: 8 hours in seconds
      const schedule = MediaSchedulerService.createSchedule({
        timespan,
        titles: [
          {
            id: mediaTitle.id.value,
            title: mediaTitle.title,
            basePlaylist: {
              submedia: mediaTitle.basePlaylist.getSubmediaMapAsArray(),
            },
          },
        ],
      })

      // Set schedule in DirectorService
      this.directorService.setCurrentSchedule(schedule)

      return {
        success: true,
        message: `Schedule created for ${mediaTitle.title}`,
        schedule: schedule.DTO,
      }
    } catch (error) {
      this.logger.error('Failed to create schedule', error)
      return {
        success: false,
        message: error.message || 'Failed to create schedule',
      }
    }
  }

  /**
   * Initialize schedule by rendering first medias to available stage
   * POST /api/stage/init-schedule
   * Equivalent to: GET /obs/initschedule in legacy
   */
  @Post('init-schedule')
  @HttpCode(HttpStatus.OK)
  async initSchedule(): Promise<{ success: boolean; stage?: any; message: string }> {
    try {
      const stage = await this.directorService.renderNextMedia()
      if (stage) {
        return {
          success: true,
          stage: stage.DTO,
          message: `Rendered first medias on stage ${stage.stageNumber}`,
        }
      }
      return {
        success: false,
        message: 'No schedule available or no media to render',
      }
    } catch (error) {
      this.logger.error('Failed to initialize schedule', error)
      return {
        success: false,
        message: error.message || 'Failed to initialize schedule',
      }
    }
  }

  /**
   * Start the schedule and begin playback
   * POST /api/stage/start-schedule
   * Equivalent to: GET /obs/startschedule in legacy
   */
  @Post('start-schedule')
  @HttpCode(HttpStatus.OK)
  async startSchedule(): Promise<{ success: boolean; message: string }> {
    try {
      await this.directorService.startSchedule()
      return {
        success: true,
        message: 'Schedule started successfully',
      }
    } catch (error) {
      this.logger.error('Failed to start schedule', error)
      return {
        success: false,
        message: error.message || 'Failed to start schedule',
      }
    }
  }

  /**
   * Create a schedule from a MediaTitle and start streaming
   * POST /api/stage/start/:mediaTitleId
   * Body: { timespan?: number } (optional, defaults to 8 hours in seconds)
   */
  @Post('start/:mediaTitleId')
  @HttpCode(HttpStatus.OK)
  async startStreaming(
    @Param('mediaTitleId') mediaTitleId: string,
    @Body() body?: { timespan?: number }
  ): Promise<{ success: boolean; message: string; schedule?: any }> {
    try {
      // Get MediaTitle from repository
      const mediaTitle = await this.mediaTitleRepository.findById(mediaTitleId)
      if (!mediaTitle) {
        return {
          success: false,
          message: `MediaTitle with ID ${mediaTitleId} not found`,
        }
      }

      // Create schedule using MediaSchedulerService
      // Convert MediaTitle to format expected by SimpleStrategy
      const timespan = body?.timespan || 8 * 60 * 60 // Default: 8 hours in seconds
      const schedule = MediaSchedulerService.createSchedule({
        timespan,
        titles: [
          {
            id: mediaTitle.id.value,
            title: mediaTitle.title,
            basePlaylist: {
              submedia: mediaTitle.basePlaylist.getSubmediaMapAsArray(),
            },
          },
        ],
      })

      // Start streaming
      await this.directorService.startStreaming(schedule)

      return {
        success: true,
        message: `Stream started with schedule for ${mediaTitle.title}`,
        schedule: schedule.DTO,
      }
    } catch (error) {
      this.logger.error('Failed to start streaming', error)
      return {
        success: false,
        message: error.message || 'Failed to start streaming',
      }
    }
  }

  /**
   * Stop streaming
   * POST /api/stage/stop
   */
  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stopStreaming(): Promise<{ success: boolean; message: string }> {
    try {
      await this.directorService.stopStreaming()
      return {
        success: true,
        message: 'Stream stopped successfully',
      }
    } catch (error) {
      this.logger.error('Failed to stop streaming', error)
      return {
        success: false,
        message: error.message || 'Failed to stop streaming',
      }
    }
  }

  /**
   * Move to next media
   * POST /api/stage/next
   */
  @Post('next')
  @HttpCode(HttpStatus.OK)
  async nextMedia(): Promise<{ success: boolean; hasMoreMedia: boolean; message: string }> {
    try {
      const result = await this.directorService.nextMedia()
      return {
        success: result.success,
        hasMoreMedia: result.hasMoreMedia,
        message: result.hasMoreMedia ? 'Moved to next media successfully' : 'No more media available',
      }
    } catch (error) {
      this.logger.error('Failed to move to next media', error)
      return {
        success: false,
        hasMoreMedia: false,
        message: error.message || 'Failed to move to next media',
      }
    }
  }

  /**
   * Render next scheduled media on an available stage
   * POST /api/stage/render-next
   */
  @Post('render-next')
  @HttpCode(HttpStatus.OK)
  async renderNextMedia(): Promise<{ success: boolean; stage?: any; message: string }> {
    try {
      const stage = await this.directorService.renderNextMedia()
      if (stage) {
        return {
          success: true,
          stage: stage.DTO,
          message: `Rendered next media on stage ${stage.stageNumber}`,
        }
      }
      return {
        success: false,
        message: 'No schedule available or no media to render',
      }
    } catch (error) {
      this.logger.error('Failed to render next media', error)
      return {
        success: false,
        message: error.message || 'Failed to render next media',
      }
    }
  }

  /**
   * Get current Director state
   * GET /api/stage/state
   */
  @Get('state')
  async getState(): Promise<{
    isStreaming: boolean
    currentStage: any | null
    stages: any[]
    hasSchedule: boolean
    scheduleHasMedia: boolean
    schedule?: any
  }> {
    const state = this.directorService.getState()
    const schedule = this.directorService.getCurrentSchedule()

    return {
      ...state,
      currentStage: state.currentStage ? state.currentStage.DTO : null,
      stages: state.stages.map((s) => s.DTO),
      schedule: schedule ? schedule.DTO : undefined,
    }
  }

  /**
   * Get all available MediaTitles for creating schedules
   * GET /api/stage/titles
   */
  @Get('titles')
  async getTitles(): Promise<any[]> {
    const titles = await this.mediaTitleRepository.findAll()
    return titles.map((title) => ({
      id: title.id.value,
      title: title.title,
      type: title.type,
      playlistCount: title.basePlaylist.getSubmediaMapAsArray().length,
    }))
  }

  /**
   * Prepare everything: initialize stages, create schedule, render first medias, and start schedule
   * POST /api/stage/prepare-everything/:mediaTitleId
   * Body: { timespan?: number } (optional, defaults to 8 hours in seconds)
   *
   * This endpoint does all steps at once:
   * 1. Initialize stages (prepare OBS scenes and stages 1-4)
   * 2. Create schedule from MediaTitle
   * 3. Render first medias to available stage
   * 4. Start schedule and begin playback
   */
  @Post('prepare-everything/:mediaTitleId')
  @HttpCode(HttpStatus.OK)
  async prepareEverything(
    @Param('mediaTitleId') mediaTitleId: string,
    @Body() body?: { timespan?: number }
  ): Promise<{
    success: boolean
    message: string
    stagesInitialized?: boolean
    scheduleCreated?: boolean
    scheduledInitialized?: boolean
    scheduledStarted?: boolean
  }> {
    try {
      // Step 1: Initialize stages (prepare OBS scenes and stages 1-4)
      this.logger.log('Step 1: Initializing stages...')
      await this.directorService.initialize()
      const stagesInitialized = true

      // Step 2: Get MediaTitle and create schedule
      this.logger.log('Step 2: Creating schedule...')
      const mediaTitle = await this.mediaTitleRepository.findById(mediaTitleId)
      if (!mediaTitle) {
        return {
          success: false,
          message: `MediaTitle with ID ${mediaTitleId} not found`,
        }
      }

      const timespan = body?.timespan || 8 * 60 * 60 // Default: 8 hours in seconds
      const schedule = MediaSchedulerService.createSchedule({
        timespan,
        titles: [
          {
            id: mediaTitle.id.value,
            title: mediaTitle.title,
            basePlaylist: {
              submedia: mediaTitle.basePlaylist.getSubmediaMapAsArray(),
            },
          },
        ],
      })

      // Set schedule in DirectorService
      this.directorService.setCurrentSchedule(schedule)
      const scheduleCreated = true

      // Step 3: Render first medias to available stage
      this.logger.log('Step 3: Rendering first medias...')
      const renderedStage = await this.directorService.renderNextMedia()
      const scheduledInitialized = renderedStage !== null

      if (!scheduledInitialized) {
        return {
          success: false,
          message: 'Failed to render first medias - no available stage or media',
          stagesInitialized,
          scheduleCreated,
          scheduledInitialized: false,
        }
      }

      // Step 4: Start schedule and begin playback
      this.logger.log('Step 4: Starting schedule...')
      await this.directorService.startSchedule()
      const scheduledStarted = true

      return {
        success: true,
        message: `Everything prepared and started for ${mediaTitle.title}`,
        stagesInitialized,
        scheduleCreated,
        scheduledInitialized,
        scheduledStarted,
      }
    } catch (error) {
      this.logger.error('Failed to prepare everything', error)
      return {
        success: false,
        message: error.message || 'Failed to prepare everything',
      }
    }
  }
}
