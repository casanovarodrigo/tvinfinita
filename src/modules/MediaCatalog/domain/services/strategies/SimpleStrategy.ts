import { ITVShowMediaDTO } from '../../entities/TVShowMedia/interfaces'
import { IScheduleOptions, MediaQueue } from '../../entities/Schedule/interfaces'

/**
 * Simple Strategy: When only one title is available, loop through all episodes
 * Fills schedule until timespan is reached
 * Tracks last scheduled episode
 */
export class SimpleStrategy {
  /**
   * Generate schedule using simple strategy
   * @param options Schedule options with timespan and titles
   * @returns Generated media queue and last scheduled media per title
   */
  public static generate(
    options: IScheduleOptions
  ): {
    toPlay: MediaQueue
    lastScheduledFromTitle: Record<string, ITVShowMediaDTO>
  } {
    const { timespan, titles } = options

    // Simple strategy only works with a single title
    if (titles.length !== 1) {
      throw new Error('SimpleStrategy requires exactly one title')
    }

    const title = titles[0]
    const episodes = title.basePlaylist.submedia

    if (episodes.length === 0) {
      return {
        toPlay: [],
        lastScheduledFromTitle: {},
      }
    }

    const toPlay: MediaQueue = []
    let currentDuration = 0
    let episodeIndex = 0

    // Find starting point if we have last scheduled media
    // For now, we'll start from the beginning
    // In the future, we can use lastScheduledFromTitle to resume

    // Loop through episodes until we fill the timespan
    while (currentDuration < timespan && episodes.length > 0) {
      const episode = episodes[episodeIndex % episodes.length]
      toPlay.push(episode)
      currentDuration += episode.duration
      episodeIndex++
    }

    // Get the last scheduled episode
    const lastScheduled = toPlay.length > 0 ? toPlay[toPlay.length - 1] : undefined

    return {
      toPlay,
      lastScheduledFromTitle: lastScheduled ? { [title.id]: lastScheduled } : {},
    }
  }
}

