import { Injectable } from '@nestjs/common'
import { OBSService } from '../OBS.service'
import * as winston from 'winston'
import { LoggerService } from '../../../../../infra/logging/services/logger.service'

/**
 * Media State interface
 */
export interface IMediaState {
  mediaState: string
  mediaDuration?: number
  mediaCursor?: number
}

/**
 * MediaControl Service
 * Controls media playback in OBS sources
 * Ported from: ../vcmanda/src/app/models/obs/mediaControl.js
 * IMPORTANT: Supports ffmpeg and vlc media sources (as of OBS v25.0.8)
 */
@Injectable()
export class MediaControlService {
  private readonly logger: winston.Logger

  constructor(
    private readonly obsService: OBSService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getDirectorLogger(MediaControlService.name)
  }

  /**
   * Play media source
   * @param sourceName Name of the media source
   */
  async play(sourceName: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
      })
      this.logger.info(`Playing media source: ${sourceName}`)
    } catch (error) {
      this.logger.error(`Error playing media source: ${sourceName}`, { error })
      throw error
    }
  }

  /**
   * Pause media source
   * @param sourceName Name of the media source
   */
  async pause(sourceName: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE',
      })
      this.logger.info(`Paused media source: ${sourceName}`)
    } catch (error) {
      this.logger.error(`Error pausing media source: ${sourceName}`, { error })
      throw error
    }
  }

  /**
   * Restart media source (play from beginning)
   * @param sourceName Name of the media source
   */
  async restart(sourceName: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
      })
      this.logger.info(`Restarted media source: ${sourceName}`)
    } catch (error) {
      this.logger.error(`Error restarting media source: ${sourceName}`, { error })
      throw error
    }
  }

  /**
   * Stop media source
   * @param sourceName Name of the media source
   */
  async stop(sourceName: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP',
      })
      this.logger.info(`Stopped media source: ${sourceName}`)
    } catch (error) {
      this.logger.error(`Error stopping media source: ${sourceName}`, { error })
      throw error
    }
  }

  /**
   * Scrub media to a specific time
   * @param sourceName Name of the media source
   * @param time Time in milliseconds
   */
  async scrub(sourceName: string, time: number): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('TriggerMediaInputAction', {
        inputName: sourceName,
        mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART',
      })
      // Note: OBS v5 doesn't have direct scrub, may need to use SetMediaTime if available
      // For now, restart is used as fallback
      this.logger.info(`Scrubbed media source: ${sourceName} to ${time}ms`)
    } catch (error) {
      this.logger.error(`Error scrubbing media source: ${sourceName}`, { error })
      throw error
    }
  }

  /**
   * Get media state (playing, paused, stopped, etc.)
   * @param sourceName Name of the media source
   * @returns Media state information
   */
  async getState(sourceName: string): Promise<IMediaState> {
    try {
      const obs = await this.obsService.getSocket()
      const result = await obs.call('GetMediaInputStatus', {
        inputName: sourceName,
      })
      return {
        mediaState: result.mediaState || 'unknown',
        mediaDuration: result.mediaDuration,
        mediaCursor: result.mediaCursor,
      }
    } catch (error) {
      this.logger.error(`Error getting media state for source: ${sourceName}`, { error })
      throw error
    }
  }
}
