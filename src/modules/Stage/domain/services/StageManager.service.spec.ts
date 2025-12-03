import { StageManagerService } from './StageManager.service'
import { Stage } from '../entities/Stage'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

describe('StageManagerService', () => {
  const mockMedia: ITVShowMediaDTO = {
    id: 'media-1',
    fileName: 'episode-1.mp4',
    title: 'Episode 1',
    filePath: '/path/to/episode-1.mp4',
    folderName: 'season-1',
    duration: 1800,
    fileExt: '.mp4',
    width: 1920,
    height: 1080,
    ratio: '16:9',
  }

  const mockMedia2: ITVShowMediaDTO = {
    id: 'media-2',
    fileName: 'episode-2.mp4',
    title: 'Episode 2',
    filePath: '/path/to/episode-2.mp4',
    folderName: 'season-1',
    duration: 1800,
    fileExt: '.mp4',
    width: 1920,
    height: 1080,
    ratio: '16:9',
  }

  beforeEach(() => {
    // Clear the stage queue before each test
    StageManagerService.clearStageQueue()
  })

  describe('initializeStages', () => {
    it('should initialize 4 stages with available status', () => {
      const stages = StageManagerService.initializeStages()

      expect(stages).toHaveLength(4)
      expect(stages[0].stageNumber).toBe(1)
      expect(stages[1].stageNumber).toBe(2)
      expect(stages[2].stageNumber).toBe(3)
      expect(stages[3].stageNumber).toBe(4)

      stages.forEach((stage) => {
        expect(stage.status).toBe('available')
        expect(stage.mediaQueue).toHaveLength(0)
        expect(stage.estimatedTimeToFinish).toBe(0)
      })
    })
  })

  describe('getAvailableStage', () => {
    it('should return the first available stage', () => {
      const stages = StageManagerService.initializeStages()
      stages[0].setStatus('in_use')
      stages[1].setStatus('on_screen')

      const available = StageManagerService.getAvailableStage(stages)

      expect(available).toBeDefined()
      expect(available?.stageNumber).toBe(3)
      expect(available?.status).toBe('available')
    })

    it('should return undefined if no stages are available', () => {
      const stages = StageManagerService.initializeStages()
      stages.forEach((stage) => stage.setStatus('in_use'))

      const available = StageManagerService.getAvailableStage(stages)

      expect(available).toBeUndefined()
    })
  })

  describe('getAvailableStages', () => {
    it('should return all available stages', () => {
      const stages = StageManagerService.initializeStages()
      stages[0].setStatus('in_use')
      stages[1].setStatus('on_screen')

      const available = StageManagerService.getAvailableStages(stages)

      expect(available).toHaveLength(2)
      expect(available[0].stageNumber).toBe(3)
      expect(available[1].stageNumber).toBe(4)
      available.forEach((stage) => {
        expect(stage.status).toBe('available')
      })
    })

    it('should return empty array if no stages are available', () => {
      const stages = StageManagerService.initializeStages()
      stages.forEach((stage) => stage.setStatus('in_use'))

      const available = StageManagerService.getAvailableStages(stages)

      expect(available).toHaveLength(0)
    })
  })

  describe('setStageInUse', () => {
    it('should set stage status to in_use and assign media queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.setStageInUse(stage, [mockMedia, mockMedia2])

      expect(stage.status).toBe('in_use')
      expect(stage.mediaQueue).toHaveLength(2)
      expect(stage.estimatedTimeToFinish).toBe(3600)
    })

    it('should update lastUsed timestamp', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date('2024-01-01T00:00:00Z'),
        combinedKey: '',
      })

      const beforeUpdate = stage.lastUsed.getTime()
      StageManagerService.setStageInUse(stage, [mockMedia])

      expect(stage.lastUsed.getTime()).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('setStageOnScreen', () => {
    it('should set stage status to on_screen', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'in_use',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      StageManagerService.setStageOnScreen(stage)

      expect(stage.status).toBe('on_screen')
    })

    it('should update lastUsed timestamp', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'in_use',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date('2024-01-01T00:00:00Z'),
        combinedKey: 'title-1',
      })

      const beforeUpdate = stage.lastUsed.getTime()
      StageManagerService.setStageOnScreen(stage)

      expect(stage.lastUsed.getTime()).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('vacateStage', () => {
    it('should set stage to available and clear queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'in_use',
        mediaQueue: [mockMedia, mockMedia2],
        estimatedTimeToFinish: 3600,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      StageManagerService.vacateStage(stage)

      expect(stage.status).toBe('available')
      expect(stage.mediaQueue).toHaveLength(0)
      expect(stage.estimatedTimeToFinish).toBe(0)
      expect(stage.combinedKey).toBe('')
    })

    it('should update lastUsed timestamp', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'in_use',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date('2024-01-01T00:00:00Z'),
        combinedKey: 'title-1',
      })

      const beforeUpdate = stage.lastUsed.getTime()
      StageManagerService.vacateStage(stage)

      expect(stage.lastUsed.getTime()).toBeGreaterThanOrEqual(beforeUpdate)
    })
  })

  describe('addStageToQueue', () => {
    it('should add stage to queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.addStageToQueue(stage)

      expect(StageManagerService.getStageQueue()).toHaveLength(1)
      expect(StageManagerService.getStageQueue()[0].stageNumber).toBe(1)
    })

    it('should not add duplicate stages to queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.addStageToQueue(stage)
      StageManagerService.addStageToQueue(stage)

      expect(StageManagerService.getStageQueue()).toHaveLength(1)
    })
  })

  describe('popNextStageInQueue', () => {
    it('should remove and return the first stage from queue', () => {
      const stage1 = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })
      const stage2 = Stage.create({
        stageNumber: 2,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.addStageToQueue(stage1)
      StageManagerService.addStageToQueue(stage2)

      const popped = StageManagerService.popNextStageInQueue()

      expect(popped?.stageNumber).toBe(1)
      expect(StageManagerService.getStageQueue()).toHaveLength(1)
      expect(StageManagerService.getStageQueue()[0].stageNumber).toBe(2)
    })

    it('should return undefined if queue is empty', () => {
      const popped = StageManagerService.popNextStageInQueue()

      expect(popped).toBeUndefined()
    })
  })

  describe('peekNextStageInQueue', () => {
    it('should return the first stage without removing it', () => {
      const stage1 = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })
      const stage2 = Stage.create({
        stageNumber: 2,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.addStageToQueue(stage1)
      StageManagerService.addStageToQueue(stage2)

      const peeked = StageManagerService.peekNextStageInQueue()

      expect(peeked?.stageNumber).toBe(1)
      expect(StageManagerService.getStageQueue()).toHaveLength(2) // Should not remove
    })

    it('should return undefined if queue is empty', () => {
      const peeked = StageManagerService.peekNextStageInQueue()

      expect(peeked).toBeUndefined()
    })
  })

  describe('removeStageFromQueue', () => {
    it('should remove stage from queue by stage number', () => {
      const stage1 = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })
      const stage2 = Stage.create({
        stageNumber: 2,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.addStageToQueue(stage1)
      StageManagerService.addStageToQueue(stage2)

      const removed = StageManagerService.removeStageFromQueue(1)

      expect(removed).toBe(true)
      expect(StageManagerService.getStageQueue()).toHaveLength(1)
      expect(StageManagerService.getStageQueue()[0].stageNumber).toBe(2)
    })

    it('should return false if stage not found in queue', () => {
      const removed = StageManagerService.removeStageFromQueue(1)

      expect(removed).toBe(false)
    })
  })

  describe('clearStageQueue', () => {
    it('should clear the stage queue', () => {
      const stage1 = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })
      const stage2 = Stage.create({
        stageNumber: 2,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.addStageToQueue(stage1)
      StageManagerService.addStageToQueue(stage2)

      StageManagerService.clearStageQueue()

      expect(StageManagerService.getStageQueue()).toHaveLength(0)
    })
  })

  describe('isStageQueueEmpty', () => {
    it('should return true when queue is empty', () => {
      expect(StageManagerService.isStageQueueEmpty()).toBe(true)
    })

    it('should return false when queue has stages', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: '',
      })

      StageManagerService.addStageToQueue(stage)

      expect(StageManagerService.isStageQueueEmpty()).toBe(false)
    })
  })

  describe('findStageByNumber', () => {
    it('should find stage by stage number', () => {
      const stages = StageManagerService.initializeStages()

      const found = StageManagerService.findStageByNumber(stages, 2)

      expect(found).toBeDefined()
      expect(found?.stageNumber).toBe(2)
    })

    it('should return undefined if stage not found', () => {
      const stages = StageManagerService.initializeStages()

      const found = StageManagerService.findStageByNumber(stages, 99)

      expect(found).toBeUndefined()
    })
  })

  describe('getStagesByStatus', () => {
    it('should return stages with matching status', () => {
      const stages = StageManagerService.initializeStages()
      stages[0].setStatus('in_use')
      stages[1].setStatus('in_use')
      stages[2].setStatus('on_screen')

      const inUse = StageManagerService.getStagesByStatus(stages, 'in_use')
      const onScreen = StageManagerService.getStagesByStatus(stages, 'on_screen')
      const available = StageManagerService.getStagesByStatus(stages, 'available')

      expect(inUse).toHaveLength(2)
      expect(onScreen).toHaveLength(1)
      expect(available).toHaveLength(1)
    })
  })
})

