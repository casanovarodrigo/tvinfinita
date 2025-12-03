/**
 * Media Math Helpers
 * Ported from: ../vcmanda/src/app/helpers/math.js
 */

export interface IMediaInfo {
  width: number
  height: number
}

export interface IStageInfo {
  width: number
  height: number
}

/**
 * Stretch media dimensions to fit into stage
 * @param mediaInfo Media dimensions (width, height)
 * @param stageInfo Stage dimensions (width, height)
 * @returns Stretched dimensions { width, height }
 */
export function stretchMedia(
  mediaInfo: IMediaInfo,
  stageInfo: IStageInfo
): { width: number; height: number } {
  // Gets media original ratio
  // How much from that to max width/height (depending which is higher)
  // Multiply that number for the original ratio
  // Sum that number with the other respective dimension
  const stageRatio = stageInfo.width / stageInfo.height
  const mediaRatio = mediaInfo.width / mediaInfo.height

  // If media is more portrait than stage - fit to height
  if (mediaRatio < stageRatio) {
    const deltaToStageHeight = stageInfo.height - mediaInfo.height
    const deltaToStageWidth = deltaToStageHeight * mediaRatio
    const newWidth = mediaInfo.width + deltaToStageWidth
    const newHeight = mediaInfo.height + deltaToStageHeight
    return {
      width: newWidth,
      height: newHeight,
    }
  } else {
    // Fit to width
    const deltaToStageWidth = stageInfo.width - mediaInfo.width
    const deltaToStageHeight = deltaToStageWidth / mediaRatio
    const newHeight = mediaInfo.height + deltaToStageHeight
    const newWidth = mediaInfo.width + deltaToStageWidth
    return {
      width: newWidth,
      height: newHeight,
    }
  }
}

/**
 * Center media positions relative to stage
 * @param mediaInfo Media dimensions (width, height) - should be stretched dimensions
 * @param stageInfo Stage dimensions (width, height)
 * @returns Centered position { x, y }
 */
export function centerMedia(mediaInfo: IMediaInfo, stageInfo: IStageInfo): { x: number; y: number } {
  const x = (stageInfo.width - mediaInfo.width) / 2
  const y = (stageInfo.height - mediaInfo.height) / 2
  return { x, y }
}

