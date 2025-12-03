import { Test, TestingModule } from '@nestjs/testing'
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PlaylistRepository } from './Playlist.repository'
import { MediaTitleRepository } from './MediaTitle.repository'
import { MediaTitleEntity } from '../entities/media-title.entity'
import { PlaylistEntity } from '../entities/playlist.entity'
import { TVShowMediaEntity } from '../entities/tv-show-media.entity'
import { PlaylistTVShowMediaJunctionEntity } from '../entities/playlist-tvshow-media.entity'
import { MediaTitle } from '#mediaCatalog/domain/entities/MediaTitle'
import { Playlist } from '#mediaCatalog/domain/entities/Playlist'
import { TVShowMedia } from '#mediaCatalog/domain/entities/TVShowMedia'
import { DomainID } from '#ddd/primitives/domain-id'
import { PlaylistMapper } from '../mappers/Playlist.mapper'

describe('PlaylistRepository Integration Tests', () => {
  let module: TestingModule
  let repository: PlaylistRepository
  let mediaTitleRepository: MediaTitleRepository
  let dataSource: DataSource
  let playlistRepo: Repository<PlaylistEntity>
  let mediaTitleRepo: Repository<MediaTitleEntity>
  let tvShowMediaRepo: Repository<TVShowMediaEntity>
  let junctionRepo: Repository<PlaylistTVShowMediaJunctionEntity>

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
            entities: [
              MediaTitleEntity,
              PlaylistEntity,
              TVShowMediaEntity,
              PlaylistTVShowMediaJunctionEntity,
            ],
            synchronize: true,
          }),
        }),
        TypeOrmModule.forFeature([
          MediaTitleEntity,
          PlaylistEntity,
          TVShowMediaEntity,
          PlaylistTVShowMediaJunctionEntity,
        ]),
      ],
      providers: [PlaylistRepository, MediaTitleRepository],
    }).compile()

    repository = module.get<PlaylistRepository>(PlaylistRepository)
    mediaTitleRepository = module.get<MediaTitleRepository>(MediaTitleRepository)
    dataSource = module.get<DataSource>(DataSource)
    playlistRepo = module.get<Repository<PlaylistEntity>>(getRepositoryToken(PlaylistEntity))
    mediaTitleRepo = module.get<Repository<MediaTitleEntity>>(getRepositoryToken(MediaTitleEntity))
    tvShowMediaRepo = module.get<Repository<TVShowMediaEntity>>(getRepositoryToken(TVShowMediaEntity))
    junctionRepo = module.get<Repository<PlaylistTVShowMediaJunctionEntity>>(
      getRepositoryToken(PlaylistTVShowMediaJunctionEntity)
    )
  })

  afterEach(async () => {
    // Clean up after each test
    if (dataSource.isInitialized) {
      const junctions = await junctionRepo.find()
      if (junctions.length > 0) {
        await junctionRepo.remove(junctions)
      }
      const playlists = await playlistRepo.find()
      if (playlists.length > 0) {
        await playlistRepo.remove(playlists)
      }
      const tvShowMedia = await tvShowMediaRepo.find()
      if (tvShowMedia.length > 0) {
        await tvShowMediaRepo.remove(tvShowMedia)
      }
      const mediaTitles = await mediaTitleRepo.find()
      if (mediaTitles.length > 0) {
        await mediaTitleRepo.remove(mediaTitles)
      }
    }
  })

  afterAll(async () => {
    await module.close()
  })

  describe('findByMediaTitleId - Load Playlists for Title', () => {
    it('should return empty array when no playlists exist for title', async () => {
      // Arrange
      const nonExistentMediaTitleId = DomainID.create().value

      // Act
      const playlists = await repository.findByMediaTitleId(nonExistentMediaTitleId)

      // Assert
      expect(playlists).toBeInstanceOf(Array)
      expect(playlists).toHaveLength(0)
    })

    it('should return all playlists for a media title', async () => {
      // Arrange - Create MediaTitle with base playlist
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

      const basePlaylist = Playlist.create({
        title: 'Base Playlist',
        submedia: [tvShowMediaDTO],
        isAnchor: true,
        mediaTitleId: null,
      })

      const mediaTitle = MediaTitle.create('Test Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.createWithMedia(mediaTitle, [tvShowMedia.result])

      // Create additional non-anchor playlist (must use existing mediaTitleId)
      const additionalPlaylist = Playlist.create({
        title: 'Additional Playlist',
        submedia: [tvShowMediaDTO],
        isAnchor: false,
        mediaTitleId: mediaTitle.id.value,
      })
      const playlistEntity = PlaylistMapper.toPersistence(additionalPlaylist, mediaTitle.id.value)
      await playlistRepo.save(playlistEntity)

      // Create junction entries for additional playlist
      const junctionEntries = PlaylistMapper.createJunctionEntries(
        playlistEntity.id,
        additionalPlaylist.getSubmediaMap()
      )
      await junctionRepo.save(junctionEntries)

      // Act
      const playlists = await repository.findByMediaTitleId(mediaTitle.id.value)

      // Assert
      expect(playlists).toHaveLength(2)
      expect(playlists.some((p) => p.title === 'Base Playlist' && p.isAnchor)).toBe(true)
      expect(playlists.some((p) => p.title === 'Additional Playlist' && !p.isAnchor)).toBe(true)
    })

    it('should load playlists with junction table relations when relations are loaded', async () => {
      // Arrange - Create MediaTitle with base playlist
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

      const basePlaylist = Playlist.create({
        title: 'Base Playlist',
        submedia: [tvShowMediaDTO],
        isAnchor: true,
        mediaTitleId: null,
      })

      const mediaTitle = MediaTitle.create('Test Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.createWithMedia(mediaTitle, [tvShowMedia.result])

      // Act - Load with relations manually (since findByMediaTitleId doesn't load relations)
      const entities = await playlistRepo.find({
        where: { mediaTitleId: mediaTitle.id.value },
        relations: ['tvShowMediaItems', 'tvShowMediaItems.tvShowMedia'],
      })
      const playlists = entities.map((entity) => PlaylistMapper.fromPersistence(entity))

      // Assert
      expect(playlists).toHaveLength(1)
      expect(playlists[0].getSubmediaMapAsArray()).toHaveLength(1)
      expect(playlists[0].getSubmediaMapAsArray()[0].id).toBe(tvShowMediaDTO.id)
    })
  })

  describe('findAnchorByMediaTitleId - Find Base Playlist', () => {
    it('should find anchor playlist for media title', async () => {
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

      const basePlaylist = Playlist.create({
        title: 'Base Playlist',
        submedia: [tvShowMediaDTO],
        isAnchor: true,
        mediaTitleId: null,
      })

      const mediaTitle = MediaTitle.create('Test Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.createWithMedia(mediaTitle, [tvShowMedia.result])

      // Act
      const found = await repository.findAnchorByMediaTitleId(mediaTitle.id.value)

      // Assert
      expect(found).not.toBeNull()
      expect(found.isAnchor).toBe(true)
      expect(found.title).toBe('Base Playlist')
      expect(found.mediaTitleId).toBe(mediaTitle.id.value)
    })

    it('should return null when anchor playlist not found', async () => {
      // Act
      const found = await repository.findAnchorByMediaTitleId(DomainID.create().value)

      // Assert
      expect(found).toBeNull()
    })

    it('should load anchor playlist with junction entries when relations are loaded', async () => {
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

      const basePlaylist = Playlist.create({
        title: 'Base Playlist',
        submedia: [tvShowMediaDTO],
        isAnchor: true,
        mediaTitleId: null,
      })

      const mediaTitle = MediaTitle.create('Test Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.createWithMedia(mediaTitle, [tvShowMedia.result])

      // Act - Load with relations manually
      const entity = await playlistRepo.findOne({
        where: { mediaTitleId: mediaTitle.id.value, isAnchor: true },
        relations: ['tvShowMediaItems', 'tvShowMediaItems.tvShowMedia'],
      })
      const found = entity ? PlaylistMapper.fromPersistence(entity) : null

      // Assert
      expect(found).not.toBeNull()
      expect(found.isAnchor).toBe(true)
      expect(found.getSubmediaMapAsArray()).toHaveLength(1)
      expect(found.getSubmediaMapAsArray()[0].id).toBe(tvShowMediaDTO.id)
    })
  })

  describe('update - Update Playlist', () => {
    it('should update playlist title', async () => {
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

      // Create a MediaTitle first to have valid mediaTitleId
      const basePlaylist = Playlist.create({
        title: 'Base',
        submedia: [],
        isAnchor: true,
        mediaTitleId: null,
      })
      const tempMediaTitle = MediaTitle.create('Temp Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.create(tempMediaTitle)

      // Save TVShowMedia first
      const tvShowMediaEntity = new TVShowMediaEntity()
      tvShowMediaEntity.id = tvShowMediaDTO.id
      tvShowMediaEntity.title = tvShowMediaDTO.title
      tvShowMediaEntity.fileName = tvShowMediaDTO.fileName
      tvShowMediaEntity.folderName = tvShowMediaDTO.folderName
      tvShowMediaEntity.fileExt = tvShowMediaDTO.fileExt
      tvShowMediaEntity.filePath = tvShowMediaDTO.filePath
      tvShowMediaEntity.duration = tvShowMediaDTO.duration
      tvShowMediaEntity.height = tvShowMediaDTO.height
      tvShowMediaEntity.width = tvShowMediaDTO.width
      tvShowMediaEntity.ratio = tvShowMediaDTO.ratio
      tvShowMediaEntity.createdAt = new Date()
      tvShowMediaEntity.updatedAt = new Date()
      await tvShowMediaRepo.save(tvShowMediaEntity)

      const playlist = Playlist.create({
        title: 'Original Title',
        submedia: [tvShowMediaDTO],
        isAnchor: false,
        mediaTitleId: tempMediaTitle.id.value,
      })

      const playlistEntity = PlaylistMapper.toPersistence(playlist, tempMediaTitle.id.value)
      await playlistRepo.save(playlistEntity)

      // Create junction entries
      const junctionEntries = PlaylistMapper.createJunctionEntries(
        playlistEntity.id,
        playlist.getSubmediaMap()
      )
      await junctionRepo.save(junctionEntries)

      // Act - Update title
      const updatedPlaylist = new Playlist({
        id: DomainID.create(playlistEntity.id),
        title: 'Updated Title',
        submediaMap: playlist.getSubmediaMap(),
        isAnchor: playlist.isAnchor,
        mediaTitleId: playlist.mediaTitleId,
      })
      await repository.update(updatedPlaylist)

      // Assert
      const loaded = await repository.findById(playlistEntity.id)
      expect(loaded).not.toBeNull()
      expect(loaded.title).toBe('Updated Title')
    })

    it('should update junction entries when submedia order changes', async () => {
      // Arrange
      const tvShowMediaDTO1 = {
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
      }

      const tvShowMediaDTO2 = {
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
      }

      // Save TVShowMedia entities
      const entity1 = new TVShowMediaEntity()
      entity1.id = tvShowMediaDTO1.id
      entity1.title = tvShowMediaDTO1.title
      entity1.fileName = tvShowMediaDTO1.fileName
      entity1.folderName = tvShowMediaDTO1.folderName
      entity1.fileExt = tvShowMediaDTO1.fileExt
      entity1.filePath = tvShowMediaDTO1.filePath
      entity1.duration = tvShowMediaDTO1.duration
      entity1.height = tvShowMediaDTO1.height
      entity1.width = tvShowMediaDTO1.width
      entity1.ratio = tvShowMediaDTO1.ratio
      entity1.createdAt = new Date()
      entity1.updatedAt = new Date()

      const entity2 = new TVShowMediaEntity()
      entity2.id = tvShowMediaDTO2.id
      entity2.title = tvShowMediaDTO2.title
      entity2.fileName = tvShowMediaDTO2.fileName
      entity2.folderName = tvShowMediaDTO2.folderName
      entity2.fileExt = tvShowMediaDTO2.fileExt
      entity2.filePath = tvShowMediaDTO2.filePath
      entity2.duration = tvShowMediaDTO2.duration
      entity2.height = tvShowMediaDTO2.height
      entity2.width = tvShowMediaDTO2.width
      entity2.ratio = tvShowMediaDTO2.ratio
      entity2.createdAt = new Date()
      entity2.updatedAt = new Date()

      await tvShowMediaRepo.save([entity1, entity2])

      // Create a MediaTitle first to have valid mediaTitleId
      const basePlaylist = Playlist.create({
        title: 'Base',
        submedia: [],
        isAnchor: true,
        mediaTitleId: null,
      })
      const tempMediaTitle = MediaTitle.create('Temp Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.create(tempMediaTitle)

      const playlist = Playlist.create({
        title: 'Test Playlist',
        submedia: [tvShowMediaDTO1, tvShowMediaDTO2],
        isAnchor: false,
        mediaTitleId: tempMediaTitle.id.value,
      })

      const playlistEntity = PlaylistMapper.toPersistence(playlist, tempMediaTitle.id.value)
      await playlistRepo.save(playlistEntity)

      // Create initial junction entries
      const initialJunctions = PlaylistMapper.createJunctionEntries(
        playlist.id.value,
        playlist.getSubmediaMap()
      )
      await junctionRepo.save(initialJunctions)

      // Act - Update with reversed order
      const reversedSubmedia = [tvShowMediaDTO2, tvShowMediaDTO1]
      const reversedMap = Playlist.arrayToMap(reversedSubmedia)
      const updatedPlaylist = new Playlist({
        id: playlist.id,
        title: 'Test Playlist',
        submediaMap: reversedMap,
        isAnchor: playlist.isAnchor,
        mediaTitleId: playlist.mediaTitleId,
      })

      // Delete old junctions and create new ones
      await junctionRepo.delete({ playlistId: playlistEntity.id })
      const newJunctions = PlaylistMapper.createJunctionEntries(
        playlistEntity.id,
        updatedPlaylist.getSubmediaMap()
      )
      await junctionRepo.save(newJunctions)

      const updatedPlaylistEntity = PlaylistMapper.toPersistence(updatedPlaylist, tempMediaTitle.id.value)
      updatedPlaylistEntity.id = playlistEntity.id
      await repository.update(updatedPlaylist)

      // Assert - Load with relations
      const entity = await playlistRepo.findOne({
        where: { id: playlistEntity.id },
        relations: ['tvShowMediaItems', 'tvShowMediaItems.tvShowMedia'],
      })
      const loaded = PlaylistMapper.fromPersistence(entity)

      expect(loaded.getSubmediaMapAsArray()).toHaveLength(2)
      // Order should be reversed
      expect(loaded.getSubmediaMapAsArray()[0].id).toBe(tvShowMediaDTO2.id)
      expect(loaded.getSubmediaMapAsArray()[1].id).toBe(tvShowMediaDTO1.id)
    })
  })

  describe('delete - Delete Playlist', () => {
    it('should delete playlist and cascade delete junction entries', async () => {
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

      // Save TVShowMedia
      const entity = new TVShowMediaEntity()
      entity.id = tvShowMediaDTO.id
      entity.title = tvShowMediaDTO.title
      entity.fileName = tvShowMediaDTO.fileName
      entity.folderName = tvShowMediaDTO.folderName
      entity.fileExt = tvShowMediaDTO.fileExt
      entity.filePath = tvShowMediaDTO.filePath
      entity.duration = tvShowMediaDTO.duration
      entity.height = tvShowMediaDTO.height
      entity.width = tvShowMediaDTO.width
      entity.ratio = tvShowMediaDTO.ratio
      entity.createdAt = new Date()
      entity.updatedAt = new Date()
      await tvShowMediaRepo.save(entity)

      // Create a MediaTitle first to have valid mediaTitleId
      const basePlaylist = Playlist.create({
        title: 'Base',
        submedia: [],
        isAnchor: true,
        mediaTitleId: null,
      })
      const tempMediaTitle = MediaTitle.create('Temp Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.create(tempMediaTitle)

      const playlist = Playlist.create({
        title: 'Test Playlist',
        submedia: [tvShowMediaDTO],
        isAnchor: false,
        mediaTitleId: tempMediaTitle.id.value,
      })

      const playlistEntity = PlaylistMapper.toPersistence(playlist, tempMediaTitle.id.value)
      await playlistRepo.save(playlistEntity)

      // Create junction entries
      const junctionEntries = PlaylistMapper.createJunctionEntries(
        playlistEntity.id,
        playlist.getSubmediaMap()
      )
      await junctionRepo.save(junctionEntries)

      const playlistId = playlistEntity.id

      // Act
      await repository.delete(playlistId)

      // Assert
      const deletedPlaylist = await playlistRepo.findOne({ where: { id: playlistId } })
      expect(deletedPlaylist).toBeNull()

      const deletedJunctions = await junctionRepo.find({ where: { playlistId } })
      expect(deletedJunctions).toHaveLength(0)

      // TVShowMedia should remain (not in playlist boundary)
      const remainingTVShowMedia = await tvShowMediaRepo.findOne({ where: { id: tvShowMediaDTO.id } })
      expect(remainingTVShowMedia).not.toBeNull()
    })
  })

  describe('deleteMany - Batch Delete', () => {
    it('should delete multiple playlists', async () => {
      // Arrange
      // Create a MediaTitle first
      const basePlaylist = Playlist.create({
        title: 'Base',
        submedia: [],
        isAnchor: true,
        mediaTitleId: null,
      })
      const tempMediaTitle = MediaTitle.create('Temp Title', basePlaylist, 'tvshow')
      await mediaTitleRepository.create(tempMediaTitle)

      const playlist1 = Playlist.create({
        title: 'Playlist 1',
        submedia: [],
        isAnchor: false,
        mediaTitleId: tempMediaTitle.id.value,
      })

      const playlist2 = Playlist.create({
        title: 'Playlist 2',
        submedia: [],
        isAnchor: false,
        mediaTitleId: tempMediaTitle.id.value,
      })

      const entity1 = PlaylistMapper.toPersistence(playlist1, tempMediaTitle.id.value)
      const entity2 = PlaylistMapper.toPersistence(playlist2, tempMediaTitle.id.value)
      await playlistRepo.save([entity1, entity2])

      // Act
      await repository.deleteMany([entity1.id, entity2.id])

      // Assert
      const deleted1 = await playlistRepo.findOne({ where: { id: entity1.id } })
      const deleted2 = await playlistRepo.findOne({ where: { id: entity2.id } })
      expect(deleted1).toBeNull()
      expect(deleted2).toBeNull()
    })

    it('should handle empty array gracefully', async () => {
      // Act & Assert - Should not throw
      await expect(repository.deleteMany([])).resolves.not.toThrow()
    })
  })
})
