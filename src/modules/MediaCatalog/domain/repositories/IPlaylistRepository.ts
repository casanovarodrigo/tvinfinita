import { Playlist } from '../entities/Playlist'

export interface IPlaylistRepository {
  create(playlist: Playlist): Promise<void>
  findById(id: string): Promise<Playlist | null>
  findByMediaTitleId(mediaTitleId: string): Promise<Playlist[]>
  findAnchorByMediaTitleId(mediaTitleId: string): Promise<Playlist | null>
  update(playlist: Playlist): Promise<void>
  delete(id: string): Promise<void>
  deleteMany(ids: string[]): Promise<void>
}
