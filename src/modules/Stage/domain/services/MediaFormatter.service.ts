import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

/**
 * OBS Media Source interface
 * Represents a media source configuration for OBS
 */
export interface IOBSMediaSource {
  sourceName: string
  sourceType: 'ffmpeg_source' | 'vlc_source' | 'media_source'
  sourceSettings: {
    local_file?: string
    is_local_file?: boolean
    looping?: boolean
    playlist?: Array<{ value: string }>
  }
  metadata?: {
    width: number
    height: number
    duration: number
  }
  position?: {
    x: number
    y: number
  }
  scale?: {
    x: number
    y: number
  }
  crop?: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

/**
 * MediaFormatter Domain Service
 * Converts domain entities to OBS-compatible format
 */
export class MediaFormatterService {
  /**
   * Format TVShowMedia DTOs to OBS media sources
   * @param media Array of TVShowMedia DTOs
   * @param stageName Name of the stage (e.g., "stage_01", "stage_02")
   * @returns Array of OBS media source configurations
   */
  public static formatMediaForObs(media: ITVShowMediaDTO[], stageName: string): IOBSMediaSource[] {
    if (!media) {
      throw new Error('Media array cannot be null or undefined')
    }

    if (media.length === 0) {
      return []
    }

    return media.map((mediaItem, index) => {
      const sourceName = this.generateSourceName(stageName, index, mediaItem)
      // Construct full file path: path + fileName + . + fileExt (matching legacy format)
      // Ensure filePath ends with a slash if it doesn't already
      // Note: fileExt is stored without the dot (e.g., "avi", "mkv"), so we need to add it
      const normalizedPath =
        mediaItem.filePath.endsWith('/') || mediaItem.filePath.endsWith('\\')
          ? mediaItem.filePath
          : `${mediaItem.filePath}/`
      const fullFilePath = `${normalizedPath}${mediaItem.fileName}.${mediaItem.fileExt}`
      const filePath = this.normalizeFilePath(fullFilePath)

      return {
        sourceName,
        sourceType: 'vlc_source' as const,
        sourceSettings: {
          playlist: [{ value: filePath }],
          // Note: vlc_source doesn't auto-play by default
          // Playback is controlled via TriggerMediaInputAction and visibility
        },
        metadata: {
          width: mediaItem.width || 1920,
          height: mediaItem.height || 1080,
          duration: mediaItem.duration || 0,
        },
      }
    })
  }

  /**
   * Format a single media item to OBS source
   * @param media TVShowMedia DTO
   * @param stageName Name of the stage
   * @param index Optional index for source naming
   * @returns OBS media source configuration
   */
  public static formatSingleMediaForObs(
    media: ITVShowMediaDTO,
    stageName: string,
    index: number = 0
  ): IOBSMediaSource {
    const sourceName = this.generateSourceName(stageName, index, media)
    // Construct full file path: path + fileName + . + fileExt (matching legacy format)
    // Ensure filePath ends with a slash if it doesn't already
    // Note: fileExt is stored without the dot (e.g., "avi", "mkv"), so we need to add it
    const normalizedPath =
      media.filePath.endsWith('/') || media.filePath.endsWith('\\') ? media.filePath : `${media.filePath}/`
    const fullFilePath = `${normalizedPath}${media.fileName}.${media.fileExt}`
    const filePath = this.normalizeFilePath(fullFilePath)

    return {
      sourceName,
      sourceType: 'vlc_source' as const,
      sourceSettings: {
        playlist: [{ value: filePath }],
        // Note: vlc_source doesn't auto-play by default
        // Playback is controlled via TriggerMediaInputAction and visibility
      },
      metadata: {
        width: media.width || 1920,
        height: media.height || 1080,
        duration: media.duration || 0,
      },
    }
  }

  /**
   * Generate a unique source name for OBS
   * Format: {sanitizedTitleName}_{sanitizedFileName}
   * The duplicate error check helps us detect if we're trying to render the same file twice
   * @param stageName Name of the stage (not used in source name, kept for compatibility)
   * @param index Index of the media item (not used in source name, kept for compatibility)
   * @param media Media item
   * @returns Generated source name
   */
  private static generateSourceName(stageName: string, index: number, media: ITVShowMediaDTO): string {
    // Sanitize title name for OBS (remove special characters, spaces)
    const sanitizedTitleName = media.title
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase()

    // Sanitize file name for OBS (remove special characters, spaces)
    const sanitizedFileName = media.fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase()

    // Remove file extension for cleaner naming
    const nameWithoutExt = sanitizedFileName.replace(/\.[^.]+$/, '')

    // Return format: {sanitizedTitleName}_{sanitizedFileName}
    return `${sanitizedTitleName}_${nameWithoutExt}`
  }

  /**
   * Normalize file path for OBS
   * Converts Windows paths to forward slashes if needed
   * @param filePath Original file path
   * @returns Normalized file path
   */
  private static normalizeFilePath(filePath: string): string {
    // OBS typically uses forward slashes, but can handle both
    // Normalize to forward slashes for consistency
    return filePath.replace(/\\/g, '/')
  }

  /**
   * Create OBS source with custom positioning
   * @param media TVShowMedia DTO
   * @param stageName Name of the stage
   * @param position Position coordinates
   * @param index Optional index for source naming
   * @returns OBS media source with positioning
   */
  public static formatMediaWithPosition(
    media: ITVShowMediaDTO,
    stageName: string,
    position: { x: number; y: number },
    index: number = 0
  ): IOBSMediaSource {
    const source = this.formatSingleMediaForObs(media, stageName, index)
    return {
      ...source,
      position,
    }
  }

  /**
   * Create OBS source with scaling
   * @param media TVShowMedia DTO
   * @param stageName Name of the stage
   * @param scale Scale factors
   * @param index Optional index for source naming
   * @returns OBS media source with scaling
   */
  public static formatMediaWithScale(
    media: ITVShowMediaDTO,
    stageName: string,
    scale: { x: number; y: number },
    index: number = 0
  ): IOBSMediaSource {
    const source = this.formatSingleMediaForObs(media, stageName, index)
    return {
      ...source,
      scale,
    }
  }

  /**
   * Create OBS source with cropping
   * @param media TVShowMedia DTO
   * @param stageName Name of the stage
   * @param crop Crop values
   * @param index Optional index for source naming
   * @returns OBS media source with cropping
   */
  public static formatMediaWithCrop(
    media: ITVShowMediaDTO,
    stageName: string,
    crop: { top: number; bottom: number; left: number; right: number },
    index: number = 0
  ): IOBSMediaSource {
    const source = this.formatSingleMediaForObs(media, stageName, index)
    return {
      ...source,
      crop,
    }
  }
}
