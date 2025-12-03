import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm'
import { MediaTitleEntity } from './media-title.entity'
import { PlaylistTVShowMediaJunctionEntity } from './playlist-tvshow-media.entity'

@Entity('playlist')
export class PlaylistEntity {
  @PrimaryColumn('uuid')
  id: string

  @Column('varchar', { length: 150 })
  title: string

  @Column('boolean', { default: false })
  isAnchor: boolean

  @Column('uuid')
  mediaTitleId: string

  @ManyToOne(() => MediaTitleEntity, (mediaTitle) => mediaTitle.playlists, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'mediaTitleId' })
  mediaTitle: MediaTitleEntity

  @OneToMany(() => PlaylistTVShowMediaJunctionEntity, (junction) => junction.playlist, {
    cascade: true,
  })
  tvShowMediaItems: PlaylistTVShowMediaJunctionEntity[]

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
