import { Test, TestingModule } from '@nestjs/testing'
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, Repository, In } from 'typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TVShowMediaRepository } from './TVShowMedia.repository'
import { TVShowMediaEntity } from '../entities/tv-show-media.entity'
import { TVShowMedia } from '#mediaCatalog/domain/entities/TVShowMedia'
import { DomainID } from '#ddd/primitives/domain-id'

describe('TVShowMediaRepository Integration Tests', () => {
  let module: TestingModule
  let repository: TVShowMediaRepository
  let dataSource: DataSource
  let mediaRepo: Repository<TVShowMediaEntity>

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('POSTGRES_HOST'),
            port: configService.get('POSTGRES_PORT'),
            username: configService.get('POSTGRES_USER'),
            password: configService.get('POSTGRES_PASSWORD'),
            database: configService.get('POSTGRES_DB'),
            entities: [TVShowMediaEntity],
            synchronize: true,
          }),
        }),
        TypeOrmModule.forFeature([TVShowMediaEntity]),
      ],
      providers: [TVShowMediaRepository],
    }).compile()

    repository = module.get<TVShowMediaRepository>(TVShowMediaRepository)
    dataSource = module.get<DataSource>(DataSource)
    mediaRepo = module.get<Repository<TVShowMediaEntity>>(getRepositoryToken(TVShowMediaEntity))
  })

  afterEach(async () => {
    // Clean up after each test
    if (dataSource.isInitialized) {
      const media = await mediaRepo.find()
      if (media.length > 0) {
        await mediaRepo.remove(media)
      }
    }
  })

  afterAll(async () => {
    await module.close()
  })

  describe('create - Single Creation', () => {
    it('should create a single TVShowMedia entity', async () => {
      // Arrange
      const tvShowMediaDTO = {
        id: DomainID.create().value,
        title: 'Episode 1',
        fileName: 'S01E01.avi',
        folderName: '1',
        fileExt: 'avi',
        filePath: '/test/path',
        duration: 2000,
        width: 1920,
        height: 1080,
        ratio: '16:9',
      }

      const tvShowMedia = TVShowMedia.create(tvShowMediaDTO)
      if (tvShowMedia.isFailure) {
        throw new Error(tvShowMedia.error.message)
      }

      // Act
      await repository.create(tvShowMedia.result)

      // Assert
      const saved = await mediaRepo.findOne({ where: { id: tvShowMediaDTO.id } })
      expect(saved).not.toBeNull()
      expect(saved.title).toBe('Episode 1')
      expect(saved.fileName).toBe('S01E01.avi')
      expect(saved.filePath).toBe('/test/path')
    })
  })

  describe('createMany - Batch Creation', () => {
    it('should create multiple TVShowMedia entities in batch', async () => {
      // Arrange
      const tvShowMediaDTOs = [
        {
          id: DomainID.create().value,
          title: 'Episode 1',
          fileName: 'S01E01.avi',
          folderName: '1',
          fileExt: 'avi',
          filePath: '/test/path1',
          duration: 2000,
          width: 1920,
          height: 1080,
          ratio: '16:9',
        },
        {
          id: DomainID.create().value,
          title: 'Episode 2',
          fileName: 'S01E02.avi',
          folderName: '1',
          fileExt: 'avi',
          filePath: '/test/path2',
          duration: 2000,
          width: 1920,
          height: 1080,
          ratio: '16:9',
        },
        {
          id: DomainID.create().value,
          title: 'Episode 3',
          fileName: 'S01E03.avi',
          folderName: '1',
          fileExt: 'avi',
          filePath: '/test/path3',
          duration: 2000,
          width: 1920,
          height: 1080,
          ratio: '16:9',
        },
      ]

      const tvShowMediaList = tvShowMediaDTOs.map((dto) => {
        const result = TVShowMedia.create(dto)
        if (result.isFailure) {
          throw new Error(result.error.message)
        }
        return result.result
      })

      // Act
      await repository.createMany(tvShowMediaList)

      // Assert
      const saved = await mediaRepo.find({
        where: { id: In(tvShowMediaDTOs.map((dto) => dto.id)) },
      })

      expect(saved).toHaveLength(3)
      expect(saved.some((m) => m.title === 'Episode 1')).toBe(true)
      expect(saved.some((m) => m.title === 'Episode 2')).toBe(true)
      expect(saved.some((m) => m.title === 'Episode 3')).toBe(true)
    })

    it('should handle empty array gracefully', async () => {
      // Act & Assert - Should not throw
      await expect(repository.createMany([])).resolves.not.toThrow()
    })
  })

  describe('findById - Find by ID', () => {
    it('should find TVShowMedia by ID', async () => {
      // Arrange
      const tvShowMediaDTO = {
        id: DomainID.create().value,
        title: 'Episode 1',
        fileName: 'S01E01.avi',
        folderName: '1',
        fileExt: 'avi',
        filePath: '/test/path',
        duration: 2000,
        width: 1920,
        height: 1080,
        ratio: '16:9',
      }

      const tvShowMedia = TVShowMedia.create(tvShowMediaDTO)
      if (tvShowMedia.isFailure) {
        throw new Error(tvShowMedia.error.message)
      }

      await repository.create(tvShowMedia.result)

      // Act
      const found = await repository.findById(tvShowMediaDTO.id)

      // Assert
      expect(found).not.toBeNull()
      expect(found.DTO.id).toBe(tvShowMediaDTO.id)
      expect(found.DTO.title).toBe('Episode 1')
      expect(found.DTO.fileName).toBe('S01E01.avi')
    })

    it('should return null for non-existent ID', async () => {
      // Act
      const found = await repository.findById('00000000-0000-0000-0000-000000000000')

      // Assert
      expect(found).toBeNull()
    })
  })

  describe('findByFilePath - Duplicate Detection', () => {
    it('should find TVShowMedia by file path', async () => {
      // Arrange
      const uniqueFilePath = '/unique/test/path/S01E01.avi'
      const tvShowMediaDTO = {
        id: DomainID.create().value,
        title: 'Episode 1',
        fileName: 'S01E01.avi',
        folderName: '1',
        fileExt: 'avi',
        filePath: uniqueFilePath,
        duration: 2000,
        width: 1920,
        height: 1080,
        ratio: '16:9',
      }

      const tvShowMedia = TVShowMedia.create(tvShowMediaDTO)
      if (tvShowMedia.isFailure) {
        throw new Error(tvShowMedia.error.message)
      }

      await repository.create(tvShowMedia.result)

      // Act
      const found = await repository.findByFilePath(uniqueFilePath)

      // Assert
      expect(found).not.toBeNull()
      expect(found.DTO.filePath).toBe(uniqueFilePath)
      expect(found.DTO.id).toBe(tvShowMediaDTO.id)
    })

    it('should return null when file path not found', async () => {
      // Act
      const found = await repository.findByFilePath('/non/existent/path.avi')

      // Assert
      expect(found).toBeNull()
    })
  })

  describe('findAll - List All', () => {
    it('should return empty array when no media exists', async () => {
      // Act
      const all = await repository.findAll()

      // Assert
      expect(all).toBeInstanceOf(Array)
      expect(all).toHaveLength(0)
    })

    it('should return all TVShowMedia entities', async () => {
      // Arrange
      const tvShowMediaDTOs = [
        {
          id: DomainID.create().value,
          title: 'Episode 1',
          fileName: 'S01E01.avi',
          folderName: '1',
          fileExt: 'avi',
          filePath: '/test/path1',
          duration: 2000,
          width: 1920,
          height: 1080,
          ratio: '16:9',
        },
        {
          id: DomainID.create().value,
          title: 'Episode 2',
          fileName: 'S01E02.avi',
          folderName: '1',
          fileExt: 'avi',
          filePath: '/test/path2',
          duration: 2000,
          width: 1920,
          height: 1080,
          ratio: '16:9',
        },
      ]

      const tvShowMediaList = tvShowMediaDTOs.map((dto) => {
        const result = TVShowMedia.create(dto)
        if (result.isFailure) {
          throw new Error(result.error.message)
        }
        return result.result
      })

      await repository.createMany(tvShowMediaList)

      // Act
      const all = await repository.findAll()

      // Assert
      expect(all).toHaveLength(2)
      expect(all.some((m) => m.DTO.title === 'Episode 1')).toBe(true)
      expect(all.some((m) => m.DTO.title === 'Episode 2')).toBe(true)
    })
  })

  describe('update - Update Entity', () => {
    it('should update TVShowMedia entity', async () => {
      // Arrange
      const tvShowMediaDTO = {
        id: DomainID.create().value,
        title: 'Original Title',
        fileName: 'S01E01.avi',
        folderName: '1',
        fileExt: 'avi',
        filePath: '/test/path',
        duration: 2000,
        width: 1920,
        height: 1080,
        ratio: '16:9',
      }

      const tvShowMedia = TVShowMedia.create(tvShowMediaDTO)
      if (tvShowMedia.isFailure) {
        throw new Error(tvShowMedia.error.message)
      }

      await repository.create(tvShowMedia.result)

      // Act - Update title
      const updatedDTO = {
        ...tvShowMediaDTO,
        title: 'Updated Title',
      }
      const updated = TVShowMedia.create(updatedDTO)
      if (updated.isFailure) {
        throw new Error(updated.error.message)
      }

      await repository.update(updated.result)

      // Assert
      const found = await repository.findById(tvShowMediaDTO.id)
      expect(found).not.toBeNull()
      expect(found.DTO.title).toBe('Updated Title')
      expect(found.DTO.fileName).toBe('S01E01.avi') // Other fields unchanged
    })
  })

  describe('delete - Single Deletion', () => {
    it('should delete TVShowMedia by ID', async () => {
      // Arrange
      const tvShowMediaDTO = {
        id: DomainID.create().value,
        title: 'Episode 1',
        fileName: 'S01E01.avi',
        folderName: '1',
        fileExt: 'avi',
        filePath: '/test/path',
        duration: 2000,
        width: 1920,
        height: 1080,
        ratio: '16:9',
      }

      const tvShowMedia = TVShowMedia.create(tvShowMediaDTO)
      if (tvShowMedia.isFailure) {
        throw new Error(tvShowMedia.error.message)
      }

      await repository.create(tvShowMedia.result)

      // Act
      await repository.delete(tvShowMediaDTO.id)

      // Assert
      const deleted = await mediaRepo.findOne({ where: { id: tvShowMediaDTO.id } })
      expect(deleted).toBeNull()
    })

    it('should handle delete with non-existent ID gracefully', async () => {
      // Act & Assert - Should not throw
      await expect(repository.delete('00000000-0000-0000-0000-000000000000')).resolves.not.toThrow()
    })
  })

  describe('deleteMany - Batch Deletion', () => {
    it('should delete multiple TVShowMedia entities', async () => {
      // Arrange
      const tvShowMediaDTOs = [
        {
          id: DomainID.create().value,
          title: 'Episode 1',
          fileName: 'S01E01.avi',
          folderName: '1',
          fileExt: 'avi',
          filePath: '/test/path1',
          duration: 2000,
          width: 1920,
          height: 1080,
          ratio: '16:9',
        },
        {
          id: DomainID.create().value,
          title: 'Episode 2',
          fileName: 'S01E02.avi',
          folderName: '1',
          fileExt: 'avi',
          filePath: '/test/path2',
          duration: 2000,
          width: 1920,
          height: 1080,
          ratio: '16:9',
        },
      ]

      const tvShowMediaList = tvShowMediaDTOs.map((dto) => {
        const result = TVShowMedia.create(dto)
        if (result.isFailure) {
          throw new Error(result.error.message)
        }
        return result.result
      })

      await repository.createMany(tvShowMediaList)

      // Act
      await repository.deleteMany(tvShowMediaDTOs.map((dto) => dto.id))

      // Assert
      const deleted = await mediaRepo.find({
        where: { id: In(tvShowMediaDTOs.map((dto) => dto.id)) },
      })
      expect(deleted).toHaveLength(0)
    })

    it('should handle empty array gracefully', async () => {
      // Act & Assert - Should not throw
      await expect(repository.deleteMany([])).resolves.not.toThrow()
    })
  })
})
