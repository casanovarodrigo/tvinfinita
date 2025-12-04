import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { SceneService } from '#stage/infra/services/OBS/Scene.service'
import { OBSPriorityQueueService, OBSMethodType } from '#stage/infra/services/OBS/OBSPriorityQueue.service'
import * as winston from 'winston'
import { LoggerService } from '../../../../infra/logging/services/logger.service'
import * as path from 'path'
import {
  BASE_SCENE,
  STARTING_STREAM_SCENE,
  TECHNICAL_BREAK_SCENE,
  OFFLINE_SCENE,
} from '#stage/domain/constants/stage.constants'

/**
 * RenderBaseScenes Use Case
 * Creates base scenes in OBS: starting-stream, technical-break, offline, and stage scenes
 */
@Injectable()
export class RenderBaseScenesUseCase {
  private readonly logger: winston.Logger

  constructor(
    private readonly obsService: OBSService,
    private readonly sceneService: SceneService,
    private readonly obsPriorityQueue: OBSPriorityQueueService,
    private readonly loggerService: LoggerService
  ) {
    this.logger = this.loggerService.getDirectorLogger(RenderBaseScenesUseCase.name)
  }

  /**
   * Execute the render base scenes use case
   * Deletes all existing scenes and recreates them for better reproducibility
   */
  async execute(): Promise<void> {
    this.logger.info('Rendering base scenes...')

    try {
      const obs = await this.obsService.getSocket()

      // Set scene collection (or create if doesn't exist)
      await this.setSceneCollection(obs)

      // Create "base" scene first (always needed for safe deletion)
      await this.createBaseScene(obs)

      // Delete all existing scenes before recreating (for reproducibility)
      // This will switch to "base" scene first to ensure safe deletion
      await this.deleteAllScenes(obs)

      // Create base scenes
      await this.createBaseScenes(obs)

      // Create stage scenes (stage_01, stage_02, stage_03, stage_04)
      await this.createStageScenes(obs)

      // Create background images for scenes
      await this.createBackgroundImages()

      // Create chat overlays
      await this.createChatOverlays()

      this.logger.info('Base scenes rendered successfully')
    } catch (error) {
      this.logger.error('Error rendering base scenes', { error })
      throw error
    }
  }

  /**
   * Create the "base" scene - a permanent scene used for safe deletion
   * This scene is always available and never deleted
   */
  private async createBaseScene(obs: any): Promise<void> {
    try {
      // Check if base scene already exists
      const scenes = await obs.call('GetSceneList')
      const baseSceneExists = scenes.scenes.some((s: any) => s.sceneName === BASE_SCENE)

      if (!baseSceneExists) {
        this.obsPriorityQueue.pushToQueue(OBSMethodType.PREPARE_BASE_SCENES_SOURCE, async () => {
          await obs.call('CreateScene', { sceneName: BASE_SCENE })
          this.logger.info(`Created base scene: ${BASE_SCENE}`)
        })
        await this.obsPriorityQueue.waitForQueueEmpty(30000)
      } else {
        this.logger.info(`Base scene ${BASE_SCENE} already exists`)
      }
    } catch (error) {
      this.logger.warn(`Could not create base scene ${BASE_SCENE}`, { error })
    }
  }

  /**
   * Delete all scenes that we manage (base scenes + stage scenes)
   * This ensures a clean state for reproducibility
   * Always switches to "base" scene first to ensure safe deletion
   * Uses OBS Priority Queue to manage deletion order and timing
   */
  private async deleteAllScenes(obs: any): Promise<void> {
    this.logger.info('Deleting existing scenes...')

    try {
      // Always switch to "base" scene first for safe deletion
      // This ensures OBS always has at least one scene (the base scene)
      this.obsPriorityQueue.pushToQueue(OBSMethodType.CHANGE_SYS_STAGE_FOCUS, async () => {
        await obs.call('SetCurrentProgramScene', { sceneName: BASE_SCENE })
        this.logger.info(`Switched to base scene: ${BASE_SCENE} for safe deletion`)
      })
      await this.obsPriorityQueue.waitForQueueEmpty(30000)

      // Get all scenes
      const scenes = await obs.call('GetSceneList')
      const allScenes = (scenes.scenes as any[]) || []

      // Define scenes we manage (excluding the permanent "base" scene)
      const managedScenes = [
        STARTING_STREAM_SCENE,
        TECHNICAL_BREAK_SCENE,
        OFFLINE_SCENE,
        'stage_01',
        'stage_02',
        'stage_03',
        'stage_04',
      ]

      // Delete only the scenes we manage (never delete "base" scene)
      const scenesToDelete = allScenes
        .map((s) => s.sceneName)
        .filter((name) => managedScenes.includes(name) && name !== BASE_SCENE)

      if (scenesToDelete.length > 0) {
        // Queue all scene deletions using priority queue
        for (const sceneName of scenesToDelete) {
          this.obsPriorityQueue.pushToQueue(OBSMethodType.DELETE_SCENE, async () => {
            try {
              await this.sceneService.deleteScene(sceneName)
              this.logger.info(`Queued deletion of scene: ${sceneName}`)
            } catch (error) {
              this.logger.warn(`Could not delete scene ${sceneName}`, { error })
            }
          })
        }

        this.logger.info(`Queued deletion of ${scenesToDelete.length} existing scene(s)`)

        // Wait for all deletions to complete before proceeding
        await this.obsPriorityQueue.waitForQueueEmpty(30000)
        this.logger.info('Scene deletions completed')
      } else {
        this.logger.info('No existing scenes to delete')
      }
    } catch (error) {
      this.logger.warn('Error deleting existing scenes', { error })
      // Continue even if deletion fails - we'll try to create scenes anyway
    }
  }

  /**
   * Set or create the scene collection
   */
  private async setSceneCollection(obs: any): Promise<void> {
    const collectionName = 'TV Infinita'

    try {
      // Try to get existing collections
      const collections = await obs.call('GetSceneCollectionList')
      const exists = collections.sceneCollections.includes(collectionName)

      if (!exists) {
        // Create new scene collection
        await obs.call('SetCurrentSceneCollection', {
          sceneCollectionName: collectionName,
        })
        this.logger.info(`Created scene collection: ${collectionName}`)
      } else {
        // Set existing collection as current
        await obs.call('SetCurrentSceneCollection', {
          sceneCollectionName: collectionName,
        })
        this.logger.info(`Using existing scene collection: ${collectionName}`)
      }
    } catch (error) {
      this.logger.warn('Could not set scene collection, using default', { error })
    }
  }

  /**
   * Create base scenes: starting-stream, technical-break, offline
   * Uses OBS Priority Queue for scene creation
   */
  private async createBaseScenes(obs: any): Promise<void> {
    const baseScenes = ['starting-stream', 'technical-break', 'offline']

    // Queue all scene creations
    for (const sceneName of baseScenes) {
      this.obsPriorityQueue.pushToQueue(OBSMethodType.PREPARE_BASE_SCENES_SOURCE, async () => {
        try {
          await obs.call('CreateScene', { sceneName })
          this.logger.info(`Created scene: ${sceneName}`)
        } catch (error) {
          this.logger.warn(`Could not create scene ${sceneName}`, { error })
        }
      })
    }

    // Wait for all scene creations to complete
    await this.obsPriorityQueue.waitForQueueEmpty(30000)
  }

  /**
   * Create stage scenes: stage_01, stage_02, stage_03, stage_04
   * Uses OBS Priority Queue for scene creation
   */
  private async createStageScenes(obs: any): Promise<void> {
    // Queue all stage scene creations
    for (let i = 1; i <= 4; i++) {
      const sceneName = `stage_0${i}`
      this.obsPriorityQueue.pushToQueue(OBSMethodType.PREPARE_BASE_SCENES_SOURCE, async () => {
        try {
          await obs.call('CreateScene', { sceneName })
          this.logger.info(`Created stage scene: ${sceneName}`)
        } catch (error) {
          this.logger.warn(`Could not create stage scene ${sceneName}`, { error })
        }
      })
    }

    // Wait for all stage scene creations to complete
    await this.obsPriorityQueue.waitForQueueEmpty(30000)
  }

  /**
   * Create background images for scenes
   * Creates image source inputs for base scenes: starting-stream, technical-break, offline
   * Uses images from assets/scene-props/ folder (copied from legacy vcmanda project)
   */
  private async createBackgroundImages(): Promise<void> {
    this.logger.info('Creating background images...')

    try {
      const obs = await this.obsService.getSocket()

      // Get project root path and construct path to assets folder
      const projectRoot = process.cwd()
      const propsPath = path.join(projectRoot, 'assets', 'scene-props')

      // Map of scene names to their background source names and image files
      // Matching legacy vcmanda project configuration
      const sceneBackgrounds = [
        {
          sceneName: 'starting-stream',
          sourceName: 'starting-stream-background',
          imageFile: 'starting-stream.png',
        },
        {
          sceneName: 'technical-break',
          sourceName: 'technical-break-background',
          imageFile: 'technical-break.png',
        },
        {
          sceneName: 'offline',
          sourceName: 'offline-background',
          imageFile: 'offline-stream.png',
        },
      ]

      for (const { sceneName, sourceName, imageFile } of sceneBackgrounds) {
        try {
          // Check if scene exists
          const scenes = await obs.call('GetSceneList')
          const sceneExists = scenes.scenes.some((s: any) => s.sceneName === sceneName)

          if (!sceneExists) {
            this.logger.warn(`Scene ${sceneName} does not exist, skipping background image creation`)
            continue
          }

          // Construct full path to image file
          const imagePath = path.join(propsPath, imageFile)

          // Check if source already exists in the scene
          const sceneItemList = await obs.call('GetSceneItemList', {
            sceneName,
          })

          const sourceExists = sceneItemList.sceneItems.some((item: any) => item.sourceName === sourceName)

          if (!sourceExists) {
            // Create image source input with the actual image file path
            await obs.call('CreateInput', {
              inputName: sourceName,
              inputKind: 'image_source',
              sceneName,
              inputSettings: {
                file: imagePath,
              },
            })

            this.logger.info(
              `Created background image source: ${sourceName} in scene: ${sceneName} with image: ${imagePath}`
            )
          } else {
            // Update existing source with the image file path
            await obs.call('SetInputSettings', {
              inputName: sourceName,
              inputSettings: {
                file: imagePath,
              },
            })

            this.logger.info(
              `Updated background image source: ${sourceName} in scene: ${sceneName} with image: ${imagePath}`
            )
          }
        } catch (error) {
          this.logger.warn(`Could not create background image for scene ${sceneName}`, error)
          // Continue with other scenes even if one fails
        }
      }
    } catch (error) {
      this.logger.error('Error creating background images', error)
      // Don't throw - allow initialization to continue even if background images fail
    }
  }

  /**
   * Create chat overlays for scenes
   * TODO: Implement when chat overlay system is available
   */
  private async createChatOverlays(): Promise<void> {
    this.logger.info('Creating chat overlays...')
    // Placeholder for chat overlay creation
    // This will be implemented when chat integration is available
  }
}
