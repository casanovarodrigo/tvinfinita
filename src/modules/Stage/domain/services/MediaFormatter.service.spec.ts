import { MediaFormatterService } from './MediaFormatter.service'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

describe('MediaFormatterService', () => {
  const mockMedia: ITVShowMediaDTO = {
    id: 'media-1',
    fileName: 'episode-1.mp4',
    title: 'Episode 1',
    filePath: 'C:\\Videos\\Show\\episode-1.mp4',
    folderName: 'season-1',
    duration: 1800,
    fileExt: '.mp4',
    width: 1920,
    height: 1080,
    ratio: '16:9',
  }

  const mockMedia2: ITVShowMediaDTO = {
    id: 'media-2',
    fileName: 'episode-2.mkv',
    title: 'Episode 2',
    filePath: '/videos/show/episode-2.mkv',
    folderName: 'season-1',
    duration: 1800,
    fileExt: '.mkv',
    width: 1920,
    height: 1080,
    ratio: '16:9',
  }

  describe('formatMediaForObs', () => {
    it('should format single media item to OBS format', () => {
      const result = MediaFormatterService.formatMediaForObs([mockMedia], 'stage_01')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        sourceName: expect.stringContaining('stage_01'),
        sourceType: 'ffmpeg_source',
        sourceSettings: {
          local_file: expect.stringContaining('episode-1.mp4'),
          is_local_file: true,
          looping: false,
          restart_on_activate: true,
        },
      })
    })

    it('should format multiple media items to OBS format', () => {
      const result = MediaFormatterService.formatMediaForObs([mockMedia, mockMedia2], 'stage_01')

      expect(result).toHaveLength(2)
      expect(result[0].sourceName).toContain('stage_01_0')
      expect(result[1].sourceName).toContain('stage_01_1')
    })

    it('should return empty array for empty media array', () => {
      const result = MediaFormatterService.formatMediaForObs([], 'stage_01')

      expect(result).toHaveLength(0)
    })

    it('should normalize Windows file paths to forward slashes', () => {
      const result = MediaFormatterService.formatMediaForObs([mockMedia], 'stage_01')

      expect(result[0].sourceSettings.local_file).not.toContain('\\')
      expect(result[0].sourceSettings.local_file).toContain('/')
    })

    it('should preserve Unix file paths', () => {
      const result = MediaFormatterService.formatMediaForObs([mockMedia2], 'stage_01')

      expect(result[0].sourceSettings.local_file).toBe('/videos/show/episode-2.mkv')
    })

    it('should sanitize file names in source names', () => {
      const mediaWithSpecialChars: ITVShowMediaDTO = {
        ...mockMedia,
        fileName: 'Episode (1) - Special!@#.mp4',
      }

      const result = MediaFormatterService.formatMediaForObs([mediaWithSpecialChars], 'stage_01')

      expect(result[0].sourceName).not.toContain(' ')
      expect(result[0].sourceName).not.toContain('(')
      expect(result[0].sourceName).not.toContain(')')
      expect(result[0].sourceName).not.toContain('!')
      expect(result[0].sourceName).not.toContain('@')
      expect(result[0].sourceName).not.toContain('#')
    })
  })

  describe('formatSingleMediaForObs', () => {
    it('should format a single media item', () => {
      const result = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_01', 0)

      expect(result.sourceType).toBe('ffmpeg_source')
      expect(result.sourceSettings.local_file).toBeDefined()
      expect(result.sourceSettings.is_local_file).toBe(true)
      expect(result.sourceName).toContain('stage_01')
    })

    it('should use provided index in source name', () => {
      const result1 = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_01', 5)
      const result2 = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_01', 10)

      expect(result1.sourceName).toContain('_5_')
      expect(result2.sourceName).toContain('_10_')
    })
  })

  describe('formatMediaWithPosition', () => {
    it('should format media with position coordinates', () => {
      const position = { x: 100, y: 200 }
      const result = MediaFormatterService.formatMediaWithPosition(mockMedia, 'stage_01', position, 0)

      expect(result.position).toEqual(position)
      expect(result.sourceType).toBe('ffmpeg_source')
      expect(result.sourceSettings.local_file).toBeDefined()
    })
  })

  describe('formatMediaWithScale', () => {
    it('should format media with scale factors', () => {
      const scale = { x: 0.5, y: 0.5 }
      const result = MediaFormatterService.formatMediaWithScale(mockMedia, 'stage_01', scale, 0)

      expect(result.scale).toEqual(scale)
      expect(result.sourceType).toBe('ffmpeg_source')
      expect(result.sourceSettings.local_file).toBeDefined()
    })
  })

  describe('formatMediaWithCrop', () => {
    it('should format media with crop values', () => {
      const crop = { top: 10, bottom: 10, left: 10, right: 10 }
      const result = MediaFormatterService.formatMediaWithCrop(mockMedia, 'stage_01', crop, 0)

      expect(result.crop).toEqual(crop)
      expect(result.sourceType).toBe('ffmpeg_source')
      expect(result.sourceSettings.local_file).toBeDefined()
    })
  })

  describe('source name generation', () => {
    it('should generate unique source names for different stages', () => {
      const result1 = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_01', 0)
      const result2 = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_02', 0)

      expect(result1.sourceName).toContain('stage_01')
      expect(result2.sourceName).toContain('stage_02')
      expect(result1.sourceName).not.toBe(result2.sourceName)
    })

    it('should generate unique source names for different indices', () => {
      const result1 = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_01', 0)
      const result2 = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_01', 1)

      expect(result1.sourceName).not.toBe(result2.sourceName)
      expect(result1.sourceName).toContain('_0_')
      expect(result2.sourceName).toContain('_1_')
    })

    it('should remove file extension from source name', () => {
      const result = MediaFormatterService.formatSingleMediaForObs(mockMedia, 'stage_01', 0)

      expect(result.sourceName).not.toContain('.mp4')
      expect(result.sourceName).toContain('episode')
    })

    it('should handle files without extensions', () => {
      const mediaWithoutExt: ITVShowMediaDTO = {
        ...mockMedia,
        fileName: 'episode-1',
      }

      const result = MediaFormatterService.formatSingleMediaForObs(mediaWithoutExt, 'stage_01', 0)

      expect(result.sourceName).toContain('episode-1')
    })
  })

  describe('file path normalization', () => {
    it('should handle mixed path separators', () => {
      const mediaWithMixedPath: ITVShowMediaDTO = {
        ...mockMedia,
        filePath: 'C:\\Videos\\Show\\episode-1.mp4',
      }

      const result = MediaFormatterService.formatSingleMediaForObs(mediaWithMixedPath, 'stage_01', 0)

      expect(result.sourceSettings.local_file).not.toContain('\\')
      expect(result.sourceSettings.local_file).toContain('/')
    })

    it('should preserve forward slashes', () => {
      const result = MediaFormatterService.formatSingleMediaForObs(mockMedia2, 'stage_01', 0)

      expect(result.sourceSettings.local_file).toBe('/videos/show/episode-2.mkv')
    })
  })

  describe('edge cases', () => {
    it('should handle null or undefined media gracefully', () => {
      expect(() => MediaFormatterService.formatMediaForObs(null as any, 'stage_01')).toThrow()
    })

    it('should handle media with very long file names', () => {
      const longFileName = 'a'.repeat(200) + '.mp4'
      const mediaWithLongName: ITVShowMediaDTO = {
        ...mockMedia,
        fileName: longFileName,
      }

      const result = MediaFormatterService.formatSingleMediaForObs(mediaWithLongName, 'stage_01', 0)

      expect(result.sourceName).toBeDefined()
      expect(result.sourceName.length).toBeGreaterThan(0)
    })

    it('should handle media with special characters in path', () => {
      const mediaWithSpecialPath: ITVShowMediaDTO = {
        ...mockMedia,
        filePath: 'C:\\Videos\\Show (2024)\\Episode [1].mp4',
      }

      const result = MediaFormatterService.formatSingleMediaForObs(mediaWithSpecialPath, 'stage_01', 0)

      expect(result.sourceSettings.local_file).toBeDefined()
      expect(result.sourceSettings.local_file).toContain('Episode')
    })
  })
})
