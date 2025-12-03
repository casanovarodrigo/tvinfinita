import { SimpleStrategy } from './SimpleStrategy'
import { IScheduleOptions } from '../../entities/Schedule/interfaces'

describe('SimpleStrategy', () => {
  const mockEpisodes = [
    {
      id: 'ep1',
      title: 'Episode 1',
      fileName: 'E01.mp4',
      filePath: '/path/E01.mp4',
      folderName: 'Season1',
      fileExt: 'mp4',
      duration: 1800, // 30 minutes
      width: 1920,
      height: 1080,
      ratio: '16:9',
    },
    {
      id: 'ep2',
      title: 'Episode 2',
      fileName: 'E02.mp4',
      filePath: '/path/E02.mp4',
      folderName: 'Season1',
      fileExt: 'mp4',
      duration: 1800,
      width: 1920,
      height: 1080,
      ratio: '16:9',
    },
    {
      id: 'ep3',
      title: 'Episode 3',
      fileName: 'E03.mp4',
      filePath: '/path/E03.mp4',
      folderName: 'Season1',
      fileExt: 'mp4',
      duration: 1800,
      width: 1920,
      height: 1080,
      ratio: '16:9',
    },
  ]

  describe('generate', () => {
    it('should generate schedule with single title', () => {
      const options: IScheduleOptions = {
        timespan: 3600, // 1 hour
        titles: [
          {
            id: 'title-1',
            title: 'Test Show',
            basePlaylist: {
              submedia: mockEpisodes,
            },
          },
        ],
      }

      const result = SimpleStrategy.generate(options)

      expect(result.toPlay.length).toBeGreaterThan(0)
      expect(result.toPlay.length).toBeLessThanOrEqual(3) // Should fit in 1 hour
      expect(result.lastScheduledFromTitle['title-1']).toBeDefined()
    })

    it('should loop through episodes when timespan exceeds total duration', () => {
      const options: IScheduleOptions = {
        timespan: 10000, // More than total duration (3 * 1800 = 5400)
        titles: [
          {
            id: 'title-1',
            title: 'Test Show',
            basePlaylist: {
              submedia: mockEpisodes,
            },
          },
        ],
      }

      const result = SimpleStrategy.generate(options)

      // Should loop through episodes multiple times
      expect(result.toPlay.length).toBeGreaterThan(3)
      expect(result.toPlay[0].id).toBe('ep1')
      expect(result.toPlay[3].id).toBe('ep1') // Should loop back
    })

    it('should stop when timespan is reached', () => {
      const options: IScheduleOptions = {
        timespan: 2000, // Less than 2 episodes (2 * 1800 = 3600)
        titles: [
          {
            id: 'title-1',
            title: 'Test Show',
            basePlaylist: {
              submedia: mockEpisodes,
            },
          },
        ],
      }

      const result = SimpleStrategy.generate(options)

      const totalDuration = result.toPlay.reduce((sum, ep) => sum + ep.duration, 0)
      expect(totalDuration).toBeLessThanOrEqual(2000 + 1800) // Allow one episode over
    })

    it('should return empty queue if no episodes', () => {
      const options: IScheduleOptions = {
        timespan: 3600,
        titles: [
          {
            id: 'title-1',
            title: 'Test Show',
            basePlaylist: {
              submedia: [],
            },
          },
        ],
      }

      const result = SimpleStrategy.generate(options)

      expect(result.toPlay).toEqual([])
      expect(result.lastScheduledFromTitle).toEqual({})
    })

    it('should throw error if more than one title provided', () => {
      const options: IScheduleOptions = {
        timespan: 3600,
        titles: [
          {
            id: 'title-1',
            title: 'Test Show 1',
            basePlaylist: {
              submedia: mockEpisodes,
            },
          },
          {
            id: 'title-2',
            title: 'Test Show 2',
            basePlaylist: {
              submedia: mockEpisodes,
            },
          },
        ],
      }

      expect(() => SimpleStrategy.generate(options)).toThrow('SimpleStrategy requires exactly one title')
    })

    it('should track last scheduled episode', () => {
      const options: IScheduleOptions = {
        timespan: 3600,
        titles: [
          {
            id: 'title-1',
            title: 'Test Show',
            basePlaylist: {
              submedia: mockEpisodes,
            },
          },
        ],
      }

      const result = SimpleStrategy.generate(options)

      expect(result.lastScheduledFromTitle['title-1']).toBeDefined()
      expect(result.lastScheduledFromTitle['title-1']).toEqual(result.toPlay[result.toPlay.length - 1])
    })
  })
})
