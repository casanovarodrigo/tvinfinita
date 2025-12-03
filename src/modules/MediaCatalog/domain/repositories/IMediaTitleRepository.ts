import { MediaTitle } from '../entities/MediaTitle'
import { TVShowMedia } from '../entities/TVShowMedia'

export interface IMediaTitleRepository {
  create(mediaTitle: MediaTitle): Promise<void>
  createWithMedia(mediaTitle: MediaTitle, tvShowMediaList: TVShowMedia[]): Promise<void>
  findById(id: string): Promise<MediaTitle | null>
  findByTitle(title: string): Promise<MediaTitle | null>
  findAll(): Promise<MediaTitle[]>
  update(mediaTitle: MediaTitle): Promise<void>
  delete(id: string): Promise<void>
}
