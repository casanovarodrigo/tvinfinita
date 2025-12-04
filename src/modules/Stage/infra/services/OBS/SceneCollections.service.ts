import { Injectable } from '@nestjs/common'
import { OBSService } from '../OBS.service'
import * as winston from 'winston'
import { LoggerService } from '../../../../../infra/logging/services/logger.service'

/**
 * Scene Collection interface
 */
export interface ISceneCollection {
  name: string
}

/**
 * SceneCollections Service
 * Manages OBS scene collections
 * Ported from: ../vcmanda/src/app/models/obs/sceneCollections.js
 */
@Injectable()
export class SceneCollectionsService {
  private readonly logger: winston.Logger

  constructor(
    private readonly obsService: OBSService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getDirectorLogger(SceneCollectionsService.name)
  }

  /**
   * Get list of all scene collections
   * @returns Array of scene collection names
   */
  async getList(): Promise<string[]> {
    try {
      const obs = await this.obsService.getSocket()
      const result = await obs.call('GetSceneCollectionList')
      return result.sceneCollections || []
    } catch (error) {
      this.logger.error('Error getting scene collections list', { error })
      throw error
    }
  }

  /**
   * Set the current scene collection
   * @param collectionName Name of the scene collection
   * @returns True if successful, false otherwise
   */
  async setCurrent(collectionName: string): Promise<boolean> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('SetCurrentSceneCollection', {
        sceneCollectionName: collectionName,
      })
      this.logger.info(`Set current scene collection to: ${collectionName}`)
      return true
    } catch (error) {
      this.logger.error(`Error setting scene collection: ${collectionName}`, { error })
      return false
    }
  }
}
