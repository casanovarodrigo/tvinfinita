import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { PlaylistEntity } from '../entities/playlist.entity'
import { Playlist } from '#mediaCatalog/domain/entities/Playlist'
import { IPlaylistRepository } from '#mediaCatalog/domain/repositories/IPlaylistRepository'
import { PlaylistMapper } from '../mappers/Playlist.mapper'

@Injectable()
export class PlaylistRepository implements IPlaylistRepository {
  constructor(
    @InjectRepository(PlaylistEntity)
    private readonly playlistRepo: Repository<PlaylistEntity>
  ) {}

  async create(playlist: Playlist): Promise<void> {
    const entity = PlaylistMapper.toPersistence(playlist)
    await this.playlistRepo.save(entity)
  }

  async findById(id: string): Promise<Playlist | null> {
    const entity = await this.playlistRepo.findOne({ where: { id } })
    if (!entity) return null
    return PlaylistMapper.fromPersistence(entity)
  }

  async findByMediaTitleId(mediaTitleId: string): Promise<Playlist[]> {
    const entities = await this.playlistRepo.find({
      where: { mediaTitleId },
    })
    return entities.map((entity) => PlaylistMapper.fromPersistence(entity))
  }

  async findAnchorByMediaTitleId(mediaTitleId: string): Promise<Playlist | null> {
    const entity = await this.playlistRepo.findOne({
      where: { mediaTitleId, isAnchor: true },
    })
    if (!entity) return null
    return PlaylistMapper.fromPersistence(entity)
  }

  async update(playlist: Playlist): Promise<void> {
    const entity = PlaylistMapper.toPersistence(playlist)
    await this.playlistRepo.save(entity)
  }

  async delete(id: string): Promise<void> {
    await this.playlistRepo.delete(id)
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.playlistRepo.delete({ id: In(ids) })
  }
}
