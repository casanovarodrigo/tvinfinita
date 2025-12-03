import { MediaSchedulerService } from './MediaScheduler.service'
import { Schedule } from '../entities/Schedule'
import { IScheduleOptions } from '../entities/Schedule/interfaces'
import { ITVShowMediaDTO } from '../entities/TVShowMedia/interfaces'

describe('MediaSchedulerService', () => {
  const mockEpisodes: ITVShowMediaDTO[] = [
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
  ]

  describe('createSchedule', () => {
    it('should create a schedule using SimpleStrategy', () => {
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

      const schedule = MediaSchedulerService.createSchedule(options)

      expect(schedule).toBeDefined()
      expect(schedule.id).toBeDefined()
      expect(schedule.unstarted).toBe(true)
      expect(schedule.toPlay.length).toBeGreaterThan(0)
    })
  })

  describe('peekNextFromSchedule', () => {
    it('should peek at next items without removing them', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: mockEpisodes,
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const peeked = MediaSchedulerService.peekNextFromSchedule(schedule, 1)

      expect(peeked).toHaveLength(1)
      expect(peeked[0]).toEqual(mockEpisodes[0])
      expect(schedule.toPlay).toHaveLength(2) // Should not remove
    })

    it('should peek multiple items', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: mockEpisodes,
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const peeked = MediaSchedulerService.peekNextFromSchedule(schedule, 2)

      expect(peeked).toHaveLength(2)
      expect(peeked).toEqual(mockEpisodes)
    })
  })

  describe('shiftSchedule', () => {
    it('should remove and return first item from schedule', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: mockEpisodes,
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const shifted = MediaSchedulerService.shiftSchedule(schedule)

      expect(shifted).toEqual(mockEpisodes[0])
      expect(MediaSchedulerService.isScheduleToPlayEmpty(schedule)).toBe(false)
      const nextPeek = MediaSchedulerService.peekNextFromSchedule(schedule, 1)
      expect(nextPeek[0]).toEqual(mockEpisodes[1])
    })

    it('should return undefined if schedule is empty', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const shifted = MediaSchedulerService.shiftSchedule(schedule)

      expect(shifted).toBeUndefined()
    })
  })

  describe('isScheduleToPlayEmpty', () => {
    it('should return true when schedule is empty', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      expect(MediaSchedulerService.isScheduleToPlayEmpty(schedule)).toBe(true)
    })

    it('should return false when schedule has items', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: mockEpisodes,
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      expect(MediaSchedulerService.isScheduleToPlayEmpty(schedule)).toBe(false)
    })
  })

  describe('updateLastScheduled', () => {
    it('should update last scheduled media for a title', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      MediaSchedulerService.updateLastScheduled(schedule, 'title-1', mockEpisodes[0])

      expect(MediaSchedulerService.getLastScheduled(schedule, 'title-1')).toEqual(mockEpisodes[0])
    })
  })

  describe('getLastScheduled', () => {
    it('should return last scheduled media for a title', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: { 'title-1': mockEpisodes[0] },
        unstarted: true,
      })

      const lastScheduled = MediaSchedulerService.getLastScheduled(schedule, 'title-1')

      expect(lastScheduled).toEqual(mockEpisodes[0])
    })

    it('should return undefined if no last scheduled', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const lastScheduled = MediaSchedulerService.getLastScheduled(schedule, 'title-1')

      expect(lastScheduled).toBeUndefined()
    })
  })
})
