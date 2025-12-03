import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm'
// import { Photo } from '../photos/photo.entity';

@Entity()
export class TVShowMedia {
  @PrimaryColumn('char', { length: 100 })
  id: number

  @PrimaryColumn('char', { length: 150 })
  name: string

  @PrimaryColumn('char', { length: 50 })
  fileName: string

  @Column('char', { length: 50 })
  folderName: string

  @Column('char', { length: 10 })
  fileExt: string

  @Column('char', { length: 150 })
  filePath: string

  @Column('int')
  duration: number

  @Column('int')
  height: string

  @Column('int')
  width: string

  @Column('char', { length: 10 })
  ratio: string

  // @Column({ default: true })
  // isActive: boolean

  // @OneToMany(type => Photo, photo => photo.user)
  // mediaTitle: MediaTitle[];
}
