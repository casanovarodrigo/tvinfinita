import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm'
// import { Photo } from '../photos/photo.entity';

@Entity()
export class MediaTitle {
  @PrimaryColumn('char', { length: 100 })
  id: number

  @PrimaryColumn('char', { length: 150 })
  title: string

  @Column('char', { length: 150 })
  path: string

  @Column('int')
  duration: number

  @Column('char', { length: 20 })
  mediaType: string

  // @Column({ default: true })
  // isActive: boolean

  // @OneToMany(type => Playlist, playlist => playlist.mediatitle)
  // playlists: Playlist[];
}
