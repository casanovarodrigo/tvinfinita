import { Entity, Column, PrimaryColumn } from 'typeorm'

@Entity('tv_show_media')
export class TVShowMediaEntity {
  @PrimaryColumn('uuid')
  id: string

  @Column('varchar', { length: 150 })
  title: string

  @Column('varchar', { length: 50 })
  fileName: string

  @Column('varchar', { length: 50 })
  folderName: string

  @Column('varchar', { length: 10 })
  fileExt: string

  @Column('varchar', { length: 500 })
  filePath: string

  @Column('numeric', { precision: 10, scale: 2 })
  duration: number

  @Column('int')
  height: number

  @Column('int')
  width: number

  @Column('varchar', { length: 10 })
  ratio: string

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
