import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm'
import { PlaylistEntity } from './playlist.entity'

@Entity('media_title')
export class MediaTitleEntity {
  @PrimaryColumn('uuid')
  id: string

  @Column('varchar', { length: 150 })
  title: string

  @Column('varchar', { length: 50 })
  type: 'tvshow' | 'movie'

  @OneToMany(() => PlaylistEntity, (playlist) => playlist.mediaTitle)
  playlists: PlaylistEntity[]

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
