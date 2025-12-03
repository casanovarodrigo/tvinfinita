import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In, DataSource } from 'typeorm'
import { MediaTitleEntity } from '../entities/media-title.entity'
import { PlaylistEntity } from '../entities/playlist.entity'
import { TVShowMediaEntity } from '../entities/tv-show-media.entity'
import { PlaylistTVShowMediaJunctionEntity } from '../entities/playlist-tvshow-media.entity'
import { MediaTitle } from '#mediaCatalog/domain/entities/MediaTitle'
import { TVShowMedia } from '#mediaCatalog/domain/entities/TVShowMedia'
import { IMediaTitleRepository } from '#mediaCatalog/domain/repositories/IMediaTitleRepository'
import { PlaylistMapper } from '../mappers/Playlist.mapper'
import { DomainID } from '#ddd/primitives/domain-id'

@Injectable()
export class MediaTitleRepository implements IMediaTitleRepository {
  constructor(
    @InjectRepository(MediaTitleEntity)
    private readonly mediaTitleRepo: Repository<MediaTitleEntity>,
    @InjectRepository(PlaylistEntity)
    private readonly playlistRepo: Repository<PlaylistEntity>,
    @InjectRepository(TVShowMediaEntity)
    private readonly tvShowMediaRepo: Repository<TVShowMediaEntity>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Creates MediaTitle aggregate root and all entities within its boundary
   * Wrapped in transaction to ensure atomicity - all or nothing
   */
  async create(mediaTitle: MediaTitle): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Save MediaTitle aggregate root
      const entity = this.toPersistence(mediaTitle)
      await manager.save(MediaTitleEntity, entity)

      // Save base playlist (part of aggregate boundary)
      const basePlaylist = mediaTitle.basePlaylist
      const playlistEntity = PlaylistMapper.toPersistence(basePlaylist, mediaTitle.id.value)
      await manager.save(PlaylistEntity, playlistEntity)
    })
  }

  /**
   * Creates MediaTitle aggregate root with associated TVShowMedia entities
   * All operations wrapped in a single transaction for atomicity
   * Used when creating a complete aggregate from scratch
   */
  async createWithMedia(mediaTitle: MediaTitle, tvShowMediaList: TVShowMedia[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 1. Save all TVShowMedia entities first
      const tvShowMediaEntities = tvShowMediaList.map((media) => {
        const dto = media.DTO
        const entity = new TVShowMediaEntity()
        entity.id = dto.id
        entity.title = dto.title
        entity.fileName = dto.fileName
        entity.folderName = dto.folderName
        entity.fileExt = dto.fileExt
        entity.filePath = dto.filePath
        entity.duration = dto.duration
        entity.height = dto.height
        entity.width = dto.width
        entity.ratio = dto.ratio
        entity.createdAt = new Date()
        entity.updatedAt = new Date()
        return entity
      })
      await manager.save(TVShowMediaEntity, tvShowMediaEntities)

      // 2. Save MediaTitle aggregate root
      const entity = this.toPersistence(mediaTitle)
      await manager.save(MediaTitleEntity, entity)

      // 3. Save base playlist (part of aggregate boundary)
      const basePlaylist = mediaTitle.basePlaylist
      const playlistEntity = PlaylistMapper.toPersistence(basePlaylist, mediaTitle.id.value)
      await manager.save(PlaylistEntity, playlistEntity)

      // 4. Create and save junction table entries for playlist-media relationship
      const submediaMap = basePlaylist.getSubmediaMap()
      const junctionEntries = PlaylistMapper.createJunctionEntries(playlistEntity.id, submediaMap)
      if (junctionEntries.length > 0) {
        await manager.save(PlaylistTVShowMediaJunctionEntity, junctionEntries)
      }
    })
  }

  async findById(id: string): Promise<MediaTitle | null> {
    const entity = await this.mediaTitleRepo.findOne({
      where: { id },
      relations: ['playlists', 'playlists.tvShowMediaItems', 'playlists.tvShowMediaItems.tvShowMedia'],
    })

    if (!entity) return null

    return this.fromPersistence(entity)
  }

  async findByTitle(title: string): Promise<MediaTitle | null> {
    const entity = await this.mediaTitleRepo.findOne({
      where: { title },
      relations: ['playlists', 'playlists.tvShowMediaItems', 'playlists.tvShowMediaItems.tvShowMedia'],
    })

    if (!entity) return null

    return this.fromPersistence(entity)
  }

  async findAll(): Promise<MediaTitle[]> {
    const entities = await this.mediaTitleRepo.find({
      relations: ['playlists', 'playlists.tvShowMediaItems', 'playlists.tvShowMediaItems.tvShowMedia'],
    })

    return entities.map((entity) => this.fromPersistence(entity))
  }

  /**
   * Updates MediaTitle aggregate root and all entities within its boundary
   * Wrapped in transaction to ensure atomicity - all or nothing
   */
  async update(mediaTitle: MediaTitle): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Update MediaTitle aggregate root
      const entity = this.toPersistence(mediaTitle)
      await manager.save(MediaTitleEntity, entity)

      // Update base playlist (part of aggregate boundary)
      const basePlaylist = mediaTitle.basePlaylist
      const playlistEntity = PlaylistMapper.toPersistence(basePlaylist, mediaTitle.id.value)
      await manager.save(PlaylistEntity, playlistEntity)

      // Delete existing junction entries and recreate them
      await manager.delete(PlaylistTVShowMediaJunctionEntity, { playlistId: playlistEntity.id })

      // Create new junction entries
      const submediaMap = basePlaylist.getSubmediaMap()
      const junctionEntries = PlaylistMapper.createJunctionEntries(playlistEntity.id, submediaMap)
      if (junctionEntries.length > 0) {
        await manager.save(PlaylistTVShowMediaJunctionEntity, junctionEntries)
      }
    })
  }

  /**
   * Deletes MediaTitle and all entities within its aggregate boundary
   * Uses database CASCADE for relationships and transaction for atomicity
   *
   * Flow:
   * 1. Find all playlists for this MediaTitle
   * 2. Extract TVShowMedia IDs from junction table entries
   * 3. Delete TVShowMedia entities (manual, no CASCADE from junction)
   * 4. Delete MediaTitle (database CASCADE automatically deletes Playlists and junction entries)
   *
   * All operations wrapped in a single transaction for atomicity
   */
  async delete(id: string): Promise<void> {
    // Use transaction to ensure atomicity
    await this.dataSource.transaction(async (manager) => {
      // Find all playlists for this MediaTitle with their junction entries
      const playlistEntities = await manager.find(PlaylistEntity, {
        where: { mediaTitleId: id },
        relations: ['tvShowMediaItems'],
      })

      // Extract all unique TVShowMedia IDs from junction table entries
      const tvShowMediaIds = new Set<string>()
      for (const playlist of playlistEntities) {
        if (playlist.tvShowMediaItems) {
          for (const junction of playlist.tvShowMediaItems) {
            tvShowMediaIds.add(junction.tvShowMediaId)
          }
        }
      }

      // Batch delete all TVShowMedia within aggregate boundary
      // Junction entries will be deleted by CASCADE when Playlists are deleted
      if (tvShowMediaIds.size > 0) {
        await manager.delete(TVShowMediaEntity, { id: In(Array.from(tvShowMediaIds)) })
      }

      // Delete MediaTitle - database CASCADE will automatically delete:
      // - All Playlists (via mediaTitleId FK with CASCADE)
      // - All junction entries (via playlistId FK with CASCADE)
      await manager.delete(MediaTitleEntity, id)
    })
  }

  /**
   * Maps domain MediaTitle to TypeORM persistence entity
   */
  private toPersistence(mediaTitle: MediaTitle): MediaTitleEntity {
    const entity = new MediaTitleEntity()
    entity.id = mediaTitle.id.value
    entity.title = mediaTitle.title
    entity.type = mediaTitle.type
    entity.updatedAt = new Date()
    return entity
  }

  /**
   * Maps TypeORM persistence entity to domain MediaTitle
   * Includes validation and reconstruction of aggregate root
   */
  private fromPersistence(entity: MediaTitleEntity): MediaTitle {
    // Find anchor playlist (basePlaylist)
    const anchorPlaylist = entity.playlists?.find((p) => p.isAnchor)
    if (!anchorPlaylist) {
      throw new Error(`MediaTitle ${entity.id} has no anchor playlist`)
    }

    const basePlaylist = PlaylistMapper.fromPersistence(anchorPlaylist)
    // Create MediaTitle with ID from persistence
    const id = entity.id ? DomainID.create(entity.id) : undefined
    const mediaTitle = MediaTitle.create(entity.title, basePlaylist, entity.type, id)
    return mediaTitle
  }
}
