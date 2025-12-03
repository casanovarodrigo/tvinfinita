/**
 * Stage Constants
 * Shared constants for stage configuration
 */

/**
 * Default OBS stage/output dimensions
 * Standard 1920x1080 (Full HD) resolution
 */
export const STAGE_INFO = {
  width: 1920,
  height: 1080,
} as const

/**
 * Maximum number of media items per stage
 */
export const MAX_MEDIA_PER_STAGE = 4

/**
 * Maximum number of stages available
 */
export const MAX_STAGE_COUNT = 4

/**
 * Base scene name - always available for safe scene deletion
 * OBS cannot delete the last scene, so we need a permanent "base" scene
 */
export const BASE_SCENE = 'base'

/**
 * Base scene names for OBS
 */
export const STARTING_STREAM_SCENE = 'starting-stream'
export const TECHNICAL_BREAK_SCENE = 'technical-break'
export const OFFLINE_SCENE = 'offline'
