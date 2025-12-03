import { Schedule } from './index'
import { IScheduleDTO, ITVShowMediaDTO } from './interfaces'

describe('Schedule Entity', () => {
  const mockMedia1: ITVShowMediaDTO = {
    id: 'media-1',
    title: 'Episode 1',
    fileName: 'E01.mp4',
    filePath: '/path/E01.mp4',
    folderName: 'Season1',
    fileExt: 'mp4',
    duration: 1800, // 30 minutes
    width: 1920,
    height: 1080,
    ratio: '16:9',
  }

  const mockMedia2: ITVShowMediaDTO = {
    id: 'media-2',
    title: 'Episode 2',
    fileName: 'E02.mp4',
    filePath: '/path/E02.mp4',
    folderName: 'Season1',
    fileExt: 'mp4',
    duration: 1800,
    width: 1920,
    height: 1080,
    ratio: '16:9',
  }

  describe('create', () => {
    it('should create a schedule with default values', () => {
      const dto: IScheduleDTO = {
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      }

      const schedule = Schedule.create(dto)

      expect(schedule).toBeDefined()
      expect(schedule.id).toBeDefined()
      expect(schedule.preStart).toEqual([])
      expect(schedule.toPlay).toEqual([])
      expect(schedule.unstarted).toBe(true)
    })

    it('should create a schedule with provided values', () => {
      const dto: IScheduleDTO = {
        id: 'schedule-1',
        preStart: [mockMedia1],
        toPlay: [mockMedia2],
        lastScheduledFromTitle: { 'title-1': mockMedia1 },
        unstarted: false,
      }

      const schedule = Schedule.create(dto)

      expect(schedule.id.value).toBe('schedule-1')
      expect(schedule.preStart).toHaveLength(1)
      expect(schedule.toPlay).toHaveLength(1)
      expect(schedule.unstarted).toBe(false)
      expect(schedule.getLastScheduled('title-1')).toEqual(mockMedia1)
    })
  })

  describe('addToPreStart', () => {
    it('should add media to preStart queue', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      schedule.addToPreStart(mockMedia1)

      expect(schedule.preStart).toHaveLength(1)
      expect(schedule.preStart[0]).toEqual(mockMedia1)
    })
  })

  describe('addToToPlay', () => {
    it('should add media to toPlay queue', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      schedule.addToToPlay(mockMedia1)

      expect(schedule.toPlay).toHaveLength(1)
      expect(schedule.toPlay[0]).toEqual(mockMedia1)
    })
  })

  describe('shiftToPlay', () => {
    it('should remove and return first item from toPlay queue', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [mockMedia1, mockMedia2],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const shifted = schedule.shiftToPlay()

      expect(shifted).toEqual(mockMedia1)
      expect(schedule.toPlay).toHaveLength(1)
      expect(schedule.toPlay[0]).toEqual(mockMedia2)
    })

    it('should return undefined if toPlay is empty', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const shifted = schedule.shiftToPlay()

      expect(shifted).toBeUndefined()
    })
  })

  describe('peekToPlay', () => {
    it('should return first N items without removing them', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [mockMedia1, mockMedia2],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const peeked = schedule.peekToPlay(1)

      expect(peeked).toHaveLength(1)
      expect(peeked[0]).toEqual(mockMedia1)
      expect(schedule.toPlay).toHaveLength(2) // Should not remove
    })

    it('should return all items if count exceeds queue length', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [mockMedia1],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const peeked = schedule.peekToPlay(5)

      expect(peeked).toHaveLength(1)
      expect(peeked[0]).toEqual(mockMedia1)
    })
  })

  describe('isToPlayEmpty', () => {
    it('should return true when toPlay is empty', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      expect(schedule.isToPlayEmpty()).toBe(true)
    })

    it('should return false when toPlay has items', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [mockMedia1],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      expect(schedule.isToPlayEmpty()).toBe(false)
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

      schedule.updateLastScheduled('title-1', mockMedia1)

      expect(schedule.getLastScheduled('title-1')).toEqual(mockMedia1)
    })
  })

  describe('getLastScheduled', () => {
    it('should return last scheduled media for a title', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: { 'title-1': mockMedia1 },
        unstarted: true,
      })

      const lastScheduled = schedule.getLastScheduled('title-1')

      expect(lastScheduled).toEqual(mockMedia1)
    })

    it('should return undefined if title has no last scheduled', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      const lastScheduled = schedule.getLastScheduled('title-1')

      expect(lastScheduled).toBeUndefined()
    })
  })

  describe('markAsStarted', () => {
    it('should mark schedule as started', () => {
      const schedule = Schedule.create({
        preStart: [],
        toPlay: [],
        lastScheduledFromTitle: {},
        unstarted: true,
      })

      schedule.markAsStarted()

      expect(schedule.unstarted).toBe(false)
    })
  })

  describe('DTO', () => {
    it('should return correct DTO representation', () => {
      const dto: IScheduleDTO = {
        id: 'schedule-1',
        preStart: [mockMedia1],
        toPlay: [mockMedia2],
        lastScheduledFromTitle: { 'title-1': mockMedia1 },
        unstarted: false,
      }

      const schedule = Schedule.create(dto)
      const resultDTO = schedule.DTO

      expect(resultDTO.id).toBe('schedule-1')
      expect(resultDTO.preStart).toEqual([mockMedia1])
      expect(resultDTO.toPlay).toEqual([mockMedia2])
      expect(resultDTO.lastScheduledFromTitle).toEqual({ 'title-1': mockMedia1 })
      expect(resultDTO.unstarted).toBe(false)
    })
  })
})
