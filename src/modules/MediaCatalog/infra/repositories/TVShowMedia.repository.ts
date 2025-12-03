import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { TVShowMediaEntity } from '../entities/tv-show-media.entity'
import { TVShowMedia } from '#mediaCatalog/domain/entities/TVShowMedia'
import { ITVShowMediaRepository } from '#mediaCatalog/domain/repositories/ITVShowMediaRepository'

@Injectable()
export class TVShowMediaRepository implements ITVShowMediaRepository {
  constructor(
    @InjectRepository(TVShowMediaEntity)
    private readonly mediaRepo: Repository<TVShowMediaEntity>
  ) {}

  async create(media: TVShowMedia): Promise<void> {
    const entity = this.toPersistence(media)
    await this.mediaRepo.save(entity)
  }

  async createMany(media: TVShowMedia[]): Promise<void> {
    const entities = media.map((m) => this.toPersistence(m))
    await this.mediaRepo.save(entities)
  }

  async findById(id: string): Promise<TVShowMedia | null> {
    const entity = await this.mediaRepo.findOne({ where: { id } })
    if (!entity) return null
    return this.fromPersistence(entity)
  }

  async findByFilePath(filePath: string): Promise<TVShowMedia | null> {
    const entity = await this.mediaRepo.findOne({ where: { filePath } })
    if (!entity) return null
    return this.fromPersistence(entity)
  }

  async findAll(): Promise<TVShowMedia[]> {
    const entities = await this.mediaRepo.find()
    return entities.map((entity) => this.fromPersistence(entity))
  }

  async update(media: TVShowMedia): Promise<void> {
    const entity = this.toPersistence(media)
    await this.mediaRepo.save(entity)
  }

  async delete(id: string): Promise<void> {
    await this.mediaRepo.delete(id)
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await this.mediaRepo.delete({ id: In(ids) })
  }

  /**
   * Maps domain TVShowMedia to TypeORM persistence entity
   * Uses DTO to extract validated values
   */
  private toPersistence(media: TVShowMedia): TVShowMediaEntity {
    const dto = media.DTO
    const entity = new TVShowMediaEntity()
    entity.id = dto.id
    entity.title = dto.title
    entity.fileName = dto.fileName
    entity.folderName = dto.folderName
    entity.fileExt = dto.fileExt
    entity.filePath = dto.filePath
    entity.duration = dto.duration
    entity.height = dto.height
    entity.width = dto.width
    entity.ratio = dto.ratio
    entity.updatedAt = new Date()
    return entity
  }

  /**
   * Maps TypeORM persistence entity to domain TVShowMedia
   * Includes validation through TVShowMedia.create()
   */
  private fromPersistence(entity: TVShowMediaEntity): TVShowMedia {
    const result = TVShowMedia.create({
      id: entity.id,
      title: entity.title,
      fileName: entity.fileName,
      folderName: entity.folderName,
      fileExt: entity.fileExt,
      filePath: entity.filePath,
      duration: entity.duration,
      height: entity.height,
      width: entity.width,
      ratio: entity.ratio,
    })

    if (result.isFailure) {
      throw new Error(`Failed to create TVShowMedia from entity: ${result.error.message}`)
    }

    return result.result
  }
}
