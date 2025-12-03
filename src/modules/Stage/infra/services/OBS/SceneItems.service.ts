import { Injectable, Logger } from '@nestjs/common'
import { OBSService } from '../OBS.service'

/**
 * Scene Item Properties interface
 */
export interface ISceneItemProperties {
  position?: { x: number; y: number }
  rotation?: number
  scale?: { x: number; y: number }
  crop?: { top: number; bottom: number; left: number; right: number }
  visible?: boolean
  locked?: boolean
  bounds?: { type: string; alignment: number; x: number; y: number }
  sourceWidth?: number
  sourceHeight?: number
  width?: number
  height?: number
}

/**
 * Scene Item interface
 */
export interface ISceneItem {
  itemId: number
  sourceKind: string
  sourceName: string
  sourceType: string
  inputKind?: string
  isGroup?: boolean
  sceneItemBlendMode?: string
  sceneItemEnabled?: boolean
  sceneItemId?: number
  sceneItemIndex?: number
  sceneItemLocked?: boolean
  sceneItemTransform?: {
    positionX: number
    positionY: number
    rotation: number
    scaleX: number
    scaleY: number
    cropTop: number
    cropBottom: number
    cropLeft: number
    cropRight: number
    alignment: number
    width: number
    height: number
    sourceWidth: number
    sourceHeight: number
  }
}

/**
 * SceneItems Service
 * Manages scene items (sources) within OBS scenes
 * Ported from: ../vcmanda/src/app/models/obs/sceneItems.js
 */
@Injectable()
export class SceneItemsService {
  private readonly logger = new Logger(SceneItemsService.name)

  constructor(private readonly obsService: OBSService) {}

  /**
   * Get all scene items from a scene
   * @param sceneName Scene name (optional, uses current scene if not provided)
   * @returns Array of scene items
   */
  async getAll(sceneName?: string): Promise<ISceneItem[]> {
    try {
      const obs = await this.obsService.getSocket()

      const params: any = {}
      if (sceneName) {
        params.sceneName = sceneName
      }

      const result = await obs.call('GetSceneItemList', params)
      return (result.sceneItems as unknown as ISceneItem[]) || []
    } catch (error) {
      this.logger.error(`Error getting scene items for scene: ${sceneName}`, error)
      throw error
    }
  }

  /**
   * Get properties of a specific scene item
   * @param itemId Scene item ID or source name
   * @param sceneName Scene name (optional, uses current scene if not provided)
   * @returns Scene item properties
   */
  async getProperties(itemId: number | string, sceneName?: string): Promise<ISceneItemProperties> {
    try {
      const obs = await this.obsService.getSocket()

      const params: any = { sceneItemId: typeof itemId === 'number' ? itemId : undefined }
      if (typeof itemId === 'string') {
        // If string, we need to find the item ID first
        const items = await this.getAll(sceneName)
        const item = items.find((i) => i.sourceName === itemId)
        if (!item) {
          throw new Error(`Scene item with source name "${itemId}" not found`)
        }
        params.sceneItemId = item.sceneItemId || item.itemId
      }

      if (sceneName) {
        params.sceneName = sceneName
      }

      const result = await obs.call('GetSceneItemTransform', params)
      const transform = result.sceneItemTransform as any

      // Map OBS v5 response to our interface
      return {
        position: {
          x: transform?.positionX || 0,
          y: transform?.positionY || 0,
        },
        rotation: transform?.rotation || 0,
        scale: {
          x: transform?.scaleX || 1,
          y: transform?.scaleY || 1,
        },
        crop: {
          top: transform?.cropTop || 0,
          bottom: transform?.cropBottom || 0,
          left: transform?.cropLeft || 0,
          right: transform?.cropRight || 0,
        },
        visible: transform?.visible !== undefined ? transform.visible : true,
        width: transform?.width,
        height: transform?.height,
        sourceWidth: transform?.sourceWidth,
        sourceHeight: transform?.sourceHeight,
      }
    } catch (error) {
      this.logger.error(`Error getting properties for scene item: ${itemId}`, error)
      throw error
    }
  }

  /**
   * Set properties of a specific scene item
   * @param itemId Scene item ID or source name
   * @param properties Properties to update
   * @param sceneName Scene name (optional, uses current scene if not provided)
   */
  async setProperties(
    itemId: number | string,
    properties: ISceneItemProperties,
    sceneName?: string
  ): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()

      // Find item ID if source name provided
      let sceneItemId: number
      if (typeof itemId === 'string') {
        const items = await this.getAll(sceneName)
        const item = items.find((i) => i.sourceName === itemId)
        if (!item) {
          throw new Error(`Scene item with source name "${itemId}" not found`)
        }
        sceneItemId = item.sceneItemId || item.itemId
      } else {
        sceneItemId = itemId
      }

      // Get current transform first
      const getParams: any = {
        sceneItemId,
      }
      if (sceneName) {
        getParams.sceneName = sceneName
      }

      const currentTransform = await obs.call('GetSceneItemTransform', getParams)
      const current = currentTransform.sceneItemTransform as any

      // Build the sceneItemTransform object with current values as defaults
      const sceneItemTransform: any = {
        positionX: properties.position?.x ?? current?.positionX ?? 0,
        positionY: properties.position?.y ?? current?.positionY ?? 0,
        rotation: properties.rotation ?? current?.rotation ?? 0,
        scaleX: properties.scale?.x ?? current?.scaleX ?? 1,
        scaleY: properties.scale?.y ?? current?.scaleY ?? 1,
        cropTop: properties.crop?.top ?? current?.cropTop ?? 0,
        cropBottom: properties.crop?.bottom ?? current?.cropBottom ?? 0,
        cropLeft: properties.crop?.left ?? current?.cropLeft ?? 0,
        cropRight: properties.crop?.right ?? current?.cropRight ?? 0,
        alignment: current?.alignment ?? 5, // Default to top-left alignment
        width: properties.width ?? current?.width,
        height: properties.height ?? current?.height,
        sourceWidth: properties.sourceWidth ?? current?.sourceWidth,
        sourceHeight: properties.sourceHeight ?? current?.sourceHeight,
      }

      // Handle bounds if provided (for stretching)
      if (properties.bounds) {
        // OBS v5 expects boundsType as a string (e.g., "OBS_BOUNDS_STRETCH")
        sceneItemTransform.boundsType = properties.bounds.type || 'OBS_BOUNDS_STRETCH'
        sceneItemTransform.boundsAlignment = properties.bounds.alignment ?? 5
        sceneItemTransform.boundsWidth = properties.bounds.x
        sceneItemTransform.boundsHeight = properties.bounds.y
      }

      const params: any = {
        sceneItemId,
        sceneItemTransform,
      }

      if (sceneName) {
        params.sceneName = sceneName
      }

      // Handle visibility separately using SetSceneItemEnabled
      if (properties.visible !== undefined) {
        await obs.call('SetSceneItemEnabled', {
          sceneItemId,
          sceneItemEnabled: properties.visible,
          sceneName: sceneName,
        })
      }

      await obs.call('SetSceneItemTransform', params)

      this.logger.log(`Updated properties for scene item: ${sceneItemId}`)
    } catch (error) {
      this.logger.error(`Error setting properties for scene item: ${itemId}`, error)
      throw error
    }
  }

  /**
   * Map bounds type string to OBS v5 bounds type number
   * @param boundsType String bounds type (e.g., "OBS_BOUNDS_STRETCH")
   * @returns OBS bounds type number
   */
  private mapBoundsType(boundsType: string): number {
    // OBS v5 bounds types (from OBS WebSocket protocol)
    const boundsTypeMap: Record<string, number> = {
      OBS_BOUNDS_NONE: 0,
      OBS_BOUNDS_STRETCH: 1,
      OBS_BOUNDS_SCALE_INNER: 2,
      OBS_BOUNDS_SCALE_OUTER: 3,
      OBS_BOUNDS_SCALE_TO_WIDTH: 4,
      OBS_BOUNDS_SCALE_TO_HEIGHT: 5,
      OBS_BOUNDS_MAX_ONLY: 6,
    }

    return boundsTypeMap[boundsType] ?? 1 // Default to STRETCH
  }

  /**
   * Remove a scene item from a scene
   * @param itemId Scene item ID or source name
   * @param sceneName Scene name (optional, uses current scene if not provided)
   */
  async removeItem(itemId: number | string, sceneName?: string): Promise<void> {
    try {
      const obs = await this.obsService.getSocket()

      // Find item ID if source name provided
      let sceneItemId: number
      if (typeof itemId === 'string') {
        const items = await this.getAll(sceneName)
        const item = items.find((i) => i.sourceName === itemId)
        if (!item) {
          throw new Error(`Scene item with source name "${itemId}" not found`)
        }
        sceneItemId = item.sceneItemId || item.itemId
      } else {
        sceneItemId = itemId
      }

      const params: any = {
        sceneItemId,
      }

      if (sceneName) {
        params.sceneName = sceneName
      }

      await obs.call('RemoveSceneItem', params)

      this.logger.log(`Removed scene item: ${sceneItemId} from scene: ${sceneName || 'current'}`)
    } catch (error) {
      this.logger.error(`Error removing scene item: ${itemId}`, error)
      throw error
    }
  }

  /**
   * Set visibility of a scene item
   * @param itemId Scene item ID or source name
   * @param visible Visibility state
   * @param sceneName Scene name (optional, uses current scene if not provided)
   */
  async setVisible(itemId: number | string, visible: boolean, sceneName?: string): Promise<void> {
    await this.setProperties(itemId, { visible }, sceneName)
  }

  /**
   * Set position of a scene item
   * @param itemId Scene item ID or source name
   * @param position Position coordinates
   * @param sceneName Scene name (optional, uses current scene if not provided)
   */
  async setPosition(
    itemId: number | string,
    position: { x: number; y: number },
    sceneName?: string
  ): Promise<void> {
    await this.setProperties(itemId, { position }, sceneName)
  }

  /**
   * Set scale of a scene item
   * @param itemId Scene item ID or source name
   * @param scale Scale factors
   * @param sceneName Scene name (optional, uses current scene if not provided)
   */
  async setScale(
    itemId: number | string,
    scale: { x: number; y: number },
    sceneName?: string
  ): Promise<void> {
    await this.setProperties(itemId, { scale }, sceneName)
  }
}
