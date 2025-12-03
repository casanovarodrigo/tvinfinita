import { MediaSchedulerService } from './MediaScheduler.service'
import { IScheduleOptions } from '../entities/Schedule/interfaces'
import { MediaTitle } from '../entities/MediaTitle'
import { Playlist } from '../entities/Playlist'
import { ITVShowMediaDTO } from '../entities/TVShowMedia/interfaces'

/**
 * Integration test for MediaSchedulerService
 * Tests schedule generation with real domain entities
 */
describe('MediaSchedulerService Integration', () => {
  const createMockEpisodes = (count: number): ITVShowMediaDTO[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `ep-${i + 1}`,
      title: `Episode ${i + 1}`,
      fileName: `E${String(i + 1).padStart(2, '0')}.mp4`,
      filePath: `/path/E${String(i + 1).padStart(2, '0')}.mp4`,
      folderName: 'Season1',
      fileExt: 'mp4',
      duration: 1800, // 30 minutes each
      width: 1920,
      height: 1080,
      ratio: '16:9',
    }))
  }

  describe('createSchedule with MediaTitle', () => {
    it('should generate schedule from MediaTitle with basePlaylist', () => {
      // Arrange - Create a MediaTitle with episodes
      const episodes = createMockEpisodes(5)
      const basePlaylist = Playlist.create({
        title: 'Test Show - Base Playlist',
        submedia: episodes,
        isAnchor: true,
        mediaTitleId: 'title-1',
      })

      const mediaTitle = MediaTitle.create('Test Show', basePlaylist, 'tvshow')

      // Act - Generate schedule
      const options: IScheduleOptions = {
        timespan: 7200, // 2 hours (should fit 4 episodes: 4 * 1800 = 7200)
        titles: [
          {
            id: mediaTitle.id.value,
            title: mediaTitle.title,
            basePlaylist: {
              submedia: basePlaylist.getSubmediaMapAsArray(),
            },
          },
        ],
      }

      const schedule = MediaSchedulerService.createSchedule(options)

      // Assert
      expect(schedule).toBeDefined()
      expect(schedule.unstarted).toBe(true)
      expect(schedule.toPlay.length).toBeGreaterThan(0)
      expect(schedule.toPlay.length).toBeLessThanOrEqual(5)

      // Verify total duration doesn't exceed timespan (with some tolerance)
      const totalDuration = schedule.toPlay.reduce((sum, ep) => sum + ep.duration, 0)
      expect(totalDuration).toBeLessThanOrEqual(7200 + 1800) // Allow one episode over

      // Verify last scheduled is tracked
      expect(schedule.getLastScheduled(mediaTitle.id.value)).toBeDefined()
    })

    it('should loop through episodes when timespan exceeds total duration', () => {
      // Arrange
      const episodes = createMockEpisodes(3) // 3 episodes = 5400 seconds
      const basePlaylist = Playlist.create({
        title: 'Test Show - Base Playlist',
        submedia: episodes,
        isAnchor: true,
        mediaTitleId: 'title-1',
      })

      const mediaTitle = MediaTitle.create('Test Show', basePlaylist, 'tvshow')

      // Act - Request more than total duration
      const options: IScheduleOptions = {
        timespan: 10000, // More than 3 episodes
        titles: [
          {
            id: mediaTitle.id.value,
            title: mediaTitle.title,
            basePlaylist: {
              submedia: basePlaylist.getSubmediaMapAsArray(),
            },
          },
        ],
      }

      const schedule = MediaSchedulerService.createSchedule(options)

      // Assert - Should loop through episodes
      expect(schedule.toPlay.length).toBeGreaterThan(3)
      // First episode should appear multiple times
      const firstEpisodeIds = schedule.toPlay.map((ep) => ep.id).filter((id) => id === 'ep-1')
      expect(firstEpisodeIds.length).toBeGreaterThan(1)
    })

    it('should handle empty playlist gracefully', () => {
      // Arrange
      const basePlaylist = Playlist.create({
        title: 'Test Show - Empty Playlist',
        submedia: [],
        isAnchor: true,
        mediaTitleId: 'title-1',
      })

      const mediaTitle = MediaTitle.create('Test Show', basePlaylist, 'tvshow')

      // Act
      const options: IScheduleOptions = {
        timespan: 7200,
        titles: [
          {
            id: mediaTitle.id.value,
            title: mediaTitle.title,
            basePlaylist: {
              submedia: [],
            },
          },
        ],
      }

      const schedule = MediaSchedulerService.createSchedule(options)

      // Assert
      expect(schedule.toPlay).toEqual([])
      expect(schedule.getLastScheduled(mediaTitle.id.value)).toBeUndefined()
    })
  })

  describe('schedule manipulation', () => {
    it('should shift items from schedule and track state', () => {
      // Arrange
      const episodes = createMockEpisodes(3)
      const options: IScheduleOptions = {
        timespan: 7200,
        titles: [
          {
            id: 'title-1',
            title: 'Test Show',
            basePlaylist: {
              submedia: episodes,
            },
          },
        ],
      }

      const schedule = MediaSchedulerService.createSchedule(options)
      const initialLength = schedule.toPlay.length

      // Act - Shift items
      const first = MediaSchedulerService.shiftSchedule(schedule)
      const second = MediaSchedulerService.shiftSchedule(schedule)

      // Assert
      expect(first).toBeDefined()
      expect(second).toBeDefined()
      expect(first).not.toEqual(second)
      expect(MediaSchedulerService.isScheduleToPlayEmpty(schedule)).toBe(initialLength === 2)

      // Peek should show next item
      const next = MediaSchedulerService.peekNextFromSchedule(schedule, 1)
      if (initialLength > 2) {
        expect(next.length).toBe(1)
      }
    })
  })
})
