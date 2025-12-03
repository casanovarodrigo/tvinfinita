import { Injectable, Logger } from '@nestjs/common'
import { OBSService } from '../OBS.service'

/**
 * Scene interface
 */
export interface IScene {
  sceneName: string
  sceneIndex: number
}

/**
 * Scene Config for batch creation
 */
export interface ISceneConfig {
  name: string
}

/**
 * Scene Service
 * Manages OBS scenes
 * Ported from: ../vcmanda/src/app/models/obs/scene.js
 */
@Injectable()
export class SceneService {
  private readonly logger = new Logger(SceneService.name)

  constructor(private readonly obsService: OBSService) {}

  /**
   * Get all scenes from the active scene collection
   * @returns Array of scenes
   */
  async getScenes(): Promise<IScene[]> {
    try {
      const obs = await this.obsService.getSocket()
      const result = await obs.call('GetSceneList')
      return (result.scenes as unknown as IScene[]) || []
    } catch (error) {
      this.logger.error('Error getting scenes list', error)
      throw error
    }
  }

  /**
   * Get a specific scene by name
   * @param sceneName Name of the scene
   * @returns Scene object or null if not found
   */
  async getScene(sceneName: string): Promise<IScene | null> {
    try {
      const scenes = await this.getScenes()
      return scenes.find((s) => s.sceneName === sceneName) || null
    } catch (error) {
      this.logger.error(`Error getting scene: ${sceneName}`, error)
      throw error
    }
  }

  /**
   * Create a single scene
   * @param sceneName Name of the scene to create
   * @returns True if successful, false otherwise
   */
  async createScene(sceneName: string): Promise<boolean> {
    try {
      const obs = await this.obsService.getSocket()
      const result = await obs.call('CreateScene', { sceneName })
      const success = result !== null
      if (success) {
        this.logger.log(`Created scene: ${sceneName}`)
      }
      return success
    } catch (error) {
      this.logger.error(`Error creating scene: ${sceneName}`, error)
      throw error
    }
  }

  /**
   * Create multiple scenes in batch
   * @param scenes Array of scene configurations
   * @returns Result of batch operation
   */
  async batchCreate(scenes: ISceneConfig[]): Promise<any> {
    try {
      const obs = await this.obsService.getSocket()

      // Create scenes sequentially (OBS v5 doesn't have CallBatch, use sequential calls)
      const results = []
      for (const scene of scenes) {
        try {
          await this.createScene(scene.name)
          results.push({ sceneName: scene.name, success: true })
        } catch (error) {
          results.push({ sceneName: scene.name, success: false, error })
        }
      }
      const result = { results }

      this.logger.log(`Batch created ${scenes.length} scenes`)
      return result
    } catch (error) {
      this.logger.error('Error batch creating scenes', error)
      throw error
    }
  }

  /**
   * Set the current scene (program scene)
   * @param sceneName Name of the scene to set
   */
  async setScene(sceneName: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('SetCurrentProgramScene', {
        sceneName,
      })
      this.logger.log(`Set current scene to: ${sceneName}`)
    } catch (error) {
      this.logger.error(`Error setting scene: ${sceneName}`, error)
      throw error
    }
  }

  /**
   * Delete a scene
   * @param sceneName Name of the scene to delete
   */
  async deleteScene(sceneName: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()
      await obs.call('RemoveScene', {
        sceneName,
      })
      this.logger.log(`Deleted scene: ${sceneName}`)
    } catch (error) {
      this.logger.error(`Error deleting scene: ${sceneName}`, error)
      throw error
    }
  }

  /**
   * Delete multiple scenes
   * @param sceneNames Array of scene names to delete
   */
  async deleteScenes(sceneNames: string[]): Promise<void> {
    for (const sceneName of sceneNames) {
      try {
        await this.deleteScene(sceneName)
      } catch (error) {
        this.logger.warn(`Could not delete scene ${sceneName}`, error)
        // Continue deleting other scenes even if one fails
      }
    }
  }
}
