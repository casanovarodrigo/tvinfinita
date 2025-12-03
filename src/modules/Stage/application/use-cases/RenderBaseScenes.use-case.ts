import { Injectable } from '@nestjs/common'
import { OBSService } from '#stage/infra/services/OBS.service'
import { Logger } from '@nestjs/common'
import * as path from 'path'

/**
 * RenderBaseScenes Use Case
 * Creates base scenes in OBS: starting-stream, technical-break, offline, and stage scenes
 */
@Injectable()
export class RenderBaseScenesUseCase {
  private readonly logger = new Logger(RenderBaseScenesUseCase.name)

  constructor(private readonly obsService: OBSService) {}

  /**
   * Execute the render base scenes use case
   */
  async execute(): Promise<void> {
    this.logger.log('Rendering base scenes...')

    try {
      const obs = await this.obsService.getSocket()

      // Set scene collection (or create if doesn't exist)
      await this.setSceneCollection(obs)

      // Create base scenes
      await this.createBaseScenes(obs)

      // Create stage scenes (stage_01, stage_02, stage_03, stage_04)
      await this.createStageScenes(obs)

      // Create background images for scenes
      await this.createBackgroundImages()

      // Create chat overlays
      await this.createChatOverlays()

      this.logger.log('Base scenes rendered successfully')
    } catch (error) {
      this.logger.error('Error rendering base scenes', error)
      throw error
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
        this.logger.log(`Created scene collection: ${collectionName}`)
      } else {
        // Set existing collection as current
        await obs.call('SetCurrentSceneCollection', {
          sceneCollectionName: collectionName,
        })
        this.logger.log(`Using existing scene collection: ${collectionName}`)
      }
    } catch (error) {
      this.logger.warn('Could not set scene collection, using default', error)
    }
  }

  /**
   * Create base scenes: starting-stream, technical-break, offline
   */
  private async createBaseScenes(obs: any): Promise<void> {
    const baseScenes = ['starting-stream', 'technical-break', 'offline']

    for (const sceneName of baseScenes) {
      try {
        // Check if scene exists
        const scenes = await obs.call('GetSceneList')
        const exists = scenes.scenes.some((s: any) => s.sceneName === sceneName)

        if (!exists) {
          await obs.call('CreateScene', { sceneName })
          this.logger.log(`Created scene: ${sceneName}`)
        } else {
          this.logger.log(`Scene already exists: ${sceneName}`)
        }
      } catch (error) {
        this.logger.warn(`Could not create scene ${sceneName}`, error)
      }
    }
  }

  /**
   * Create stage scenes: stage_01, stage_02, stage_03, stage_04
   */
  private async createStageScenes(obs: any): Promise<void> {
    for (let i = 1; i <= 4; i++) {
      const sceneName = `stage_0${i}`

      try {
        // Check if scene exists
        const scenes = await obs.call('GetSceneList')
        const exists = scenes.scenes.some((s: any) => s.sceneName === sceneName)

        if (!exists) {
          await obs.call('CreateScene', { sceneName })
          this.logger.log(`Created stage scene: ${sceneName}`)
        } else {
          this.logger.log(`Stage scene already exists: ${sceneName}`)
        }
      } catch (error) {
        this.logger.warn(`Could not create stage scene ${sceneName}`, error)
      }
    }
  }

  /**
   * Create background images for scenes
   * Creates image source inputs for base scenes: starting-stream, technical-break, offline
   * Uses images from assets/scene-props/ folder (copied from legacy vcmanda project)
   */
  private async createBackgroundImages(): Promise<void> {
    this.logger.log('Creating background images...')

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

            this.logger.log(`Created background image source: ${sourceName} in scene: ${sceneName} with image: ${imagePath}`)
          } else {
            // Update existing source with the image file path
            await obs.call('SetInputSettings', {
              inputName: sourceName,
              inputSettings: {
                file: imagePath,
              },
            })

            this.logger.log(`Updated background image source: ${sourceName} in scene: ${sceneName} with image: ${imagePath}`)
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
    this.logger.log('Creating chat overlays...')
    // Placeholder for chat overlay creation
    // This will be implemented when chat integration is available
  }
}
