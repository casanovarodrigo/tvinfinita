import { Stage } from './index'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'
import { IStageDTO } from './interfaces'

describe('Stage Domain Entity', () => {
  const mockMedia: ITVShowMediaDTO = {
    id: 'media-1',
    fileName: 'episode-1.mp4',
    title: 'Episode 1',
    filePath: '/path/to/episode-1.mp4',
    folderName: 'season-1',
    duration: 1800, // 30 minutes
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
    duration: 1800, // 30 minutes
    fileExt: '.mp4',
    width: 1920,
    height: 1080,
    ratio: '16:9',
  }

  describe('create', () => {
    it('should create a stage with valid data', () => {
      const dto: IStageDTO = {
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      }

      const stage = Stage.create(dto)

      expect(stage).toBeDefined()
      expect(stage.stageNumber).toBe(1)
      expect(stage.status).toBe('available')
      expect(stage.mediaQueue).toEqual([])
      expect(stage.estimatedTimeToFinish).toBe(0)
      expect(stage.combinedKey).toBe('title-1')
    })

    it('should create a stage with an ID', () => {
      const dto: IStageDTO = {
        id: 'stage-123',
        stageNumber: 2,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      }

      const stage = Stage.create(dto)

      expect(stage.id.value).toBe('stage-123')
    })

    it('should create a stage with media queue', () => {
      const dto: IStageDTO = {
        stageNumber: 1,
        status: 'in_use',
        mediaQueue: [mockMedia, mockMedia2],
        estimatedTimeToFinish: 3600,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      }

      const stage = Stage.create(dto)

      expect(stage.mediaQueue).toHaveLength(2)
      expect(stage.estimatedTimeToFinish).toBe(3600)
    })

    it('should convert string lastUsed to Date', () => {
      const lastUsed = new Date('2024-01-01T00:00:00Z')
      const dto: IStageDTO = {
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: lastUsed.toISOString(),
        combinedKey: 'title-1',
      }

      const stage = Stage.create(dto)

      expect(stage.lastUsed).toBeInstanceOf(Date)
      expect(stage.lastUsed.getTime()).toBe(lastUsed.getTime())
    })

    it('should throw error for invalid stage number (< 1)', () => {
      const dto: IStageDTO = {
        stageNumber: 0,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      }

      expect(() => Stage.create(dto)).toThrow('Stage number must be between 1 and 4')
    })

    it('should throw error for invalid stage number (> 4)', () => {
      const dto: IStageDTO = {
        stageNumber: 5,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      }

      expect(() => Stage.create(dto)).toThrow('Stage number must be between 1 and 4')
    })

    it('should throw error for invalid status', () => {
      const dto = {
        stageNumber: 1,
        status: 'invalid_status',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      } as unknown as IStageDTO

      expect(() => Stage.create(dto)).toThrow('Invalid status')
    })
  })

  describe('setStatus', () => {
    it('should update the stage status', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      stage.setStatus('in_use')
      expect(stage.status).toBe('in_use')

      stage.setStatus('on_screen')
      expect(stage.status).toBe('on_screen')

      stage.setStatus('available')
      expect(stage.status).toBe('available')
    })

    it('should throw error for invalid status', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      expect(() => stage.setStatus('invalid' as any)).toThrow('Invalid status')
    })
  })

  describe('setMediaQueue', () => {
    it('should set the media queue and update estimated time', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      stage.setMediaQueue([mockMedia, mockMedia2])

      expect(stage.mediaQueue).toHaveLength(2)
      expect(stage.estimatedTimeToFinish).toBe(3600) // 1800 + 1800
    })

    it('should create a copy of the queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      const queue = [mockMedia]
      stage.setMediaQueue(queue)

      queue.push(mockMedia2)
      expect(stage.mediaQueue).toHaveLength(1) // Should not be affected by external changes
    })
  })

  describe('addToQueue', () => {
    it('should add media to the queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      stage.addToQueue(mockMedia)
      expect(stage.mediaQueue).toHaveLength(1)
      expect(stage.estimatedTimeToFinish).toBe(1800)
    })

    it('should update estimated time when adding media', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      stage.addToQueue(mockMedia2)
      expect(stage.estimatedTimeToFinish).toBe(3600)
    })
  })

  describe('removeFromQueue', () => {
    it('should remove media from queue by index', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia, mockMedia2],
        estimatedTimeToFinish: 3600,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      const removed = stage.removeFromQueue(0)
      expect(removed).toEqual(mockMedia)
      expect(stage.mediaQueue).toHaveLength(1)
      expect(stage.estimatedTimeToFinish).toBe(1800)
    })

    it('should return undefined for invalid index', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      expect(stage.removeFromQueue(-1)).toBeUndefined()
      expect(stage.removeFromQueue(10)).toBeUndefined()
      expect(stage.mediaQueue).toHaveLength(1)
    })
  })

  describe('clearQueue', () => {
    it('should clear the media queue and reset estimated time', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia, mockMedia2],
        estimatedTimeToFinish: 3600,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      stage.clearQueue()
      expect(stage.mediaQueue).toHaveLength(0)
      expect(stage.estimatedTimeToFinish).toBe(0)
    })
  })

  describe('peekQueue', () => {
    it('should return the first media without removing it', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia, mockMedia2],
        estimatedTimeToFinish: 3600,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      const peeked = stage.peekQueue()
      expect(peeked).toEqual(mockMedia)
      expect(stage.mediaQueue).toHaveLength(2) // Should not remove
    })

    it('should return undefined for empty queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      expect(stage.peekQueue()).toBeUndefined()
    })
  })

  describe('shiftQueue', () => {
    it('should remove and return the first media', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia, mockMedia2],
        estimatedTimeToFinish: 3600,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      const shifted = stage.shiftQueue()
      expect(shifted).toEqual(mockMedia)
      expect(stage.mediaQueue).toHaveLength(1)
      expect(stage.estimatedTimeToFinish).toBe(1800)
    })

    it('should return undefined for empty queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      expect(stage.shiftQueue()).toBeUndefined()
    })
  })

  describe('isQueueEmpty', () => {
    it('should return true for empty queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      expect(stage.isQueueEmpty()).toBe(true)
    })

    it('should return false for non-empty queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      expect(stage.isQueueEmpty()).toBe(false)
    })
  })

  describe('updateLastUsed', () => {
    it('should update the last used timestamp', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date('2024-01-01T00:00:00Z'),
        combinedKey: 'title-1',
      })

      const beforeUpdate = stage.lastUsed.getTime()
      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        stage.updateLastUsed()
        expect(stage.lastUsed.getTime()).toBeGreaterThan(beforeUpdate)
      }, 10)
    })
  })

  describe('setCombinedKey', () => {
    it('should update the combined key', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      stage.setCombinedKey('title-2')
      expect(stage.combinedKey).toBe('title-2')
    })
  })

  describe('DTO', () => {
    it('should return a DTO representation', () => {
      const lastUsed = new Date('2024-01-01T00:00:00Z')
      const stage = Stage.create({
        id: 'stage-123',
        stageNumber: 2,
        status: 'in_use',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed,
        combinedKey: 'title-1',
      })

      const dto = stage.DTO

      expect(dto).toEqual({
        id: 'stage-123',
        stageNumber: 2,
        status: 'in_use',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: lastUsed.toISOString(),
        combinedKey: 'title-1',
      })
    })

    it('should return a copy of the media queue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      const dto = stage.DTO
      dto.mediaQueue.push(mockMedia2)

      expect(stage.mediaQueue).toHaveLength(1) // Should not be affected
    })
  })

  describe('immutability', () => {
    it('should return a copy of mediaQueue', () => {
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [mockMedia],
        estimatedTimeToFinish: 1800,
        lastUsed: new Date(),
        combinedKey: 'title-1',
      })

      const queue = stage.mediaQueue
      queue.push(mockMedia2)

      expect(stage.mediaQueue).toHaveLength(1) // Should not be affected
    })

    it('should return a copy of lastUsed', () => {
      const lastUsed = new Date('2024-06-15T12:00:00Z') // Use a date that's clearly in 2024
      const stage = Stage.create({
        stageNumber: 1,
        status: 'available',
        mediaQueue: [],
        estimatedTimeToFinish: 0,
        lastUsed,
        combinedKey: 'title-1',
      })

      const originalYear = stage.lastUsed.getFullYear()
      const returnedDate = stage.lastUsed
      returnedDate.setFullYear(2025)

      // Should not be affected because getter returns a new Date object each time
      expect(stage.lastUsed.getFullYear()).toBe(originalYear)
      expect(returnedDate.getFullYear()).toBe(2025) // The returned date was modified
    })
  })
})
