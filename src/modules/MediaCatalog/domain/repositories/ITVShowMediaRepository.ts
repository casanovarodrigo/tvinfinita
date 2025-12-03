import { TVShowMedia } from '../entities/TVShowMedia'

export interface ITVShowMediaRepository {
  create(media: TVShowMedia): Promise<void>
  createMany(media: TVShowMedia[]): Promise<void>
  findById(id: string): Promise<TVShowMedia | null>
  findByFilePath(filePath: string): Promise<TVShowMedia | null>
  findAll(): Promise<TVShowMedia[]>
  update(media: TVShowMedia): Promise<void>
  delete(id: string): Promise<void>
  deleteMany(ids: string[]): Promise<void>
}
