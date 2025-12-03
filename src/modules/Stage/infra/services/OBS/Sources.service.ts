import { Injectable, Logger } from '@nestjs/common'
import { OBSService } from '../OBS.service'

/**
 * Source Settings interface
 */
export interface ISourceSettings {
  [key: string]: any
}

/**
 * Source Config for batch creation
 */
export interface ISourceConfig {
  sourceName: string
  sourceKind: string
  sceneName: string
  sourceSettings: ISourceSettings
  setVisible?: boolean
}

/**
 * Source interface
 */
export interface ISource {
  sourceName: string
  sourceType: string
  sourceKind?: string
  isGroup?: boolean
  inputKind?: string
}

/**
 * Sources Service
 * Manages OBS sources/inputs
 * Ported from: ../vcmanda/src/app/models/obs/sources.js
 */
@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name)

  constructor(private readonly obsService: OBSService) {}

  /**
   * Create a single source/input
   * @param sourceName Name of the source
   * @param sourceKind Kind of source (e.g., 'ffmpeg_source', 'image_source')
   * @param sceneName Scene to add the source to
   * @param settings Source settings
   * @param setVisible Whether to make the source visible (default: true)
   * @returns True if successful, false otherwise
   */
  async create(
    sourceName: string,
    sourceKind: string,
    sceneName: string,
    settings: ISourceSettings,
    setVisible: boolean = true
  ): Promise<boolean> {
    try {
      const obs = await this.obsService.getSocket()

      const result = await obs.call('CreateInput', {
        inputName: sourceName,
        inputKind: sourceKind,
        sceneName,
        inputSettings: settings,
        sceneItemEnabled: setVisible,
      })

      const success = result !== null
      if (success) {
        this.logger.log(`Created source: ${sourceName} in scene: ${sceneName}`)
      }
      return success
    } catch (error) {
      this.logger.error(`Error creating source: ${sourceName}`, error)
      throw error
    }
  }

  /**
   * Create multiple sources in batch
   * @param sources Array of source configurations
   * @returns Result of batch operation
   */
  async batchCreate(sources: ISourceConfig[]): Promise<any> {
    try {
      const obs = await this.obsService.getSocket()

      // Create sources sequentially (OBS v5 doesn't have CallBatch, use sequential calls)
      const results = []
      for (const source of sources) {
        try {
          await this.create(
            source.sourceName,
            source.sourceKind,
            source.sceneName,
            source.sourceSettings,
            source.setVisible
          )
          results.push({ sourceName: source.sourceName, success: true })
        } catch (error) {
          results.push({ sourceName: source.sourceName, success: false, error })
        }
      }
      const result = { results }

      this.logger.log(`Batch created ${sources.length} sources`)
      return result
    } catch (error) {
      this.logger.error('Error batch creating sources', error)
      throw error
    }
  }

  /**
   * Get settings for a source
   * @param sourceName Name of the source
   * @returns Source settings
   */
  async getSettings(sourceName: string): Promise<ISourceSettings> {
    try {
      const obs = await this.obsService.getSocket()
      const result = await obs.call('GetInputSettings', {
        inputName: sourceName,
      })
      return result.inputSettings || {}
    } catch (error) {
      this.logger.error(`Error getting settings for source: ${sourceName}`, error)
      throw error
    }
  }

  /**
   * Get list of all sources in the current scene collection
   * @returns Array of sources
   */
  async getList(): Promise<ISource[]> {
    try {
      const obs = await this.obsService.getSocket()
      const result = await obs.call('GetInputList')
      return (result.inputs as unknown as ISource[]) || []
    } catch (error) {
      this.logger.error('Error getting sources list', error)
      throw error
    }
  }
}
