import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { PlaylistEntity } from './playlist.entity'
import { TVShowMediaEntity } from './tv-show-media.entity'

/**
 * Junction table entity for many-to-many relationship between Playlist and TVShowMedia
 * Maintains order/index of media items in the playlist
 *
 * Naming convention: [Entity1][Entity2]JunctionEntity
 * This makes it immediately clear this is a junction/link table, not a domain entity
 */
@Entity('playlist_tvshow_media')
@Index(['playlistId', 'order']) // Index for efficient ordering queries
export class PlaylistTVShowMediaJunctionEntity {
  @PrimaryColumn('uuid')
  playlistId: string

  @PrimaryColumn('uuid')
  tvShowMediaId: string

  @Column('int')
  order: number // Maintains the sequence/order of media items in the playlist

  @ManyToOne(() => PlaylistEntity, (playlist) => playlist.tvShowMediaItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: PlaylistEntity

  @ManyToOne(() => TVShowMediaEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tvShowMediaId' })
  tvShowMedia: TVShowMediaEntity

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
