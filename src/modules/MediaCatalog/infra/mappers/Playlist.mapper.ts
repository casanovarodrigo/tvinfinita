import { PlaylistEntity } from '../entities/playlist.entity'
import { PlaylistTVShowMediaJunctionEntity } from '../entities/playlist-tvshow-media.entity'
import { Playlist } from '#mediaCatalog/domain/entities/Playlist'
import { DomainID } from '#ddd/primitives/domain-id'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

/**
 * Shared mapper utility for converting between Playlist domain entity
 * and PlaylistEntity persistence model.
 *
 * Used by both MediaTitleRepository (for aggregate boundary management)
 * and PlaylistRepository (for standalone Playlist operations).
 */
export class PlaylistMapper {
  /**
   * Maps domain Playlist to TypeORM persistence entity
   * Note: Junction table entries are created separately in repository
   * @param playlist Domain Playlist entity
   * @param mediaTitleId Optional mediaTitleId override (used when mapping within aggregate)
   * @returns TypeORM PlaylistEntity (without junction entries)
   */
  static toPersistence(playlist: Playlist, mediaTitleId?: string): PlaylistEntity {
    const entity = new PlaylistEntity()
    entity.id = playlist.id.value
    entity.title = playlist.title
    entity.isAnchor = playlist.isAnchor
    entity.mediaTitleId = mediaTitleId || playlist.mediaTitleId
    entity.updatedAt = new Date()
    return entity
  }

  /**
   * Creates junction table entries from domain Playlist submedia map
   * @param playlistId Playlist ID
   * @param submediaMap Map of order -> ITVShowMediaDTO
   * @returns Array of PlaylistTVShowMediaJunctionEntity
   */
  static createJunctionEntries(
    playlistId: string,
    submediaMap: Map<number, ITVShowMediaDTO>
  ): PlaylistTVShowMediaJunctionEntity[] {
    const entries: PlaylistTVShowMediaJunctionEntity[] = []
    for (const [order, dto] of submediaMap.entries()) {
      if (!dto.id) {
        throw new Error(`TVShowMedia DTO missing ID at order ${order}`)
      }
      const junction = new PlaylistTVShowMediaJunctionEntity()
      junction.playlistId = playlistId
      junction.tvShowMediaId = dto.id
      junction.order = order
      junction.updatedAt = new Date()
      entries.push(junction)
    }
    return entries
  }

  /**
   * Maps TypeORM persistence entity to domain Playlist
   * Converts loaded relationships to domain model
   * @param entity TypeORM PlaylistEntity with loaded tvShowMediaItems relationship
   * @returns Domain Playlist entity
   */
  static fromPersistence(entity: PlaylistEntity): Playlist {
    // Convert junction entries to DTOs in order
    const submediaDTOs: ITVShowMediaDTO[] = []
    if (entity.tvShowMediaItems && entity.tvShowMediaItems.length > 0) {
      // Sort by order and convert TVShowMediaEntity to DTO
      const sortedItems = [...entity.tvShowMediaItems].sort((a, b) => a.order - b.order)
      for (const junction of sortedItems) {
        if (junction.tvShowMedia) {
          const media = junction.tvShowMedia
          submediaDTOs.push({
            id: media.id,
            title: media.title,
            fileName: media.fileName,
            folderName: media.folderName,
            fileExt: media.fileExt,
            filePath: media.filePath,
            duration: Number(media.duration),
            height: media.height,
            width: media.width,
            ratio: media.ratio,
          })
        }
      }
    }

    const submediaMap = Playlist.arrayToMap<ITVShowMediaDTO>(submediaDTOs)

    // Create Playlist with ID from persistence
    const playlist = new Playlist({
      id: entity.id ? DomainID.create(entity.id) : undefined,
      title: entity.title,
      submediaMap,
      isAnchor: entity.isAnchor,
      mediaTitleId: entity.mediaTitleId,
    })

    return playlist
  }
}
