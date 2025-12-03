import { Entity } from '#ddd/primitives/entity'
import { DomainEntity } from '#ddd/primitives/domain-entity'
import { DomainID } from '#ddd/primitives/domain-id'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'
import { IStageDTO, StageStatus } from './interfaces'

interface IStageProps extends DomainEntity {
  stageNumber: number
  status: StageStatus
  mediaQueue: ITVShowMediaDTO[]
  estimatedTimeToFinish: number
  lastUsed: Date
  combinedKey: string
}

/**
 * Stage Domain Entity
 * Represents a stage (1-4) that can display media content
 * Stages can be available, in use, or on screen
 */
export class Stage extends Entity<IStageProps> {
  private constructor(props: IStageProps) {
    super(props)
  }

  public static create(dto: IStageDTO): Stage {
    // Validate stage number (1-4)
    if (dto.stageNumber < 1 || dto.stageNumber > 4) {
      throw new Error('Stage number must be between 1 and 4')
    }

    // Validate status
    const validStatuses: StageStatus[] = ['available', 'in_use', 'on_screen']
    if (!validStatuses.includes(dto.status)) {
      throw new Error(`Invalid status: ${dto.status}. Must be one of: ${validStatuses.join(', ')}`)
    }

    // Convert lastUsed to Date if it's a string
    const lastUsed = dto.lastUsed instanceof Date ? dto.lastUsed : new Date(dto.lastUsed)

    return new Stage({
      id: dto.id ? DomainID.create(dto.id) : DomainID.create(),
      stageNumber: dto.stageNumber,
      status: dto.status,
      mediaQueue: [...dto.mediaQueue], // Create a copy to ensure immutability
      estimatedTimeToFinish: dto.estimatedTimeToFinish,
      lastUsed,
      combinedKey: dto.combinedKey,
    })
  }

  public get stageNumber(): number {
    return this.props.stageNumber
  }

  public get status(): StageStatus {
    return this.props.status
  }

  public get mediaQueue(): ITVShowMediaDTO[] {
    return [...this.props.mediaQueue] // Return a copy to ensure immutability
  }

  public get estimatedTimeToFinish(): number {
    return this.props.estimatedTimeToFinish
  }

  public get lastUsed(): Date {
    return new Date(this.props.lastUsed) // Return a copy to ensure immutability
  }

  public get combinedKey(): string {
    return this.props.combinedKey
  }

  /**
   * Set the stage status
   */
  public setStatus(status: StageStatus): void {
    const validStatuses: StageStatus[] = ['available', 'in_use', 'on_screen']
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
    }
    this.props.status = status
  }

  /**
   * Set the media queue for this stage
   */
  public setMediaQueue(mediaQueue: ITVShowMediaDTO[]): void {
    this.props.mediaQueue = [...mediaQueue] // Create a copy
    this.updateEstimatedTimeToFinish()
  }

  /**
   * Add media to the queue
   */
  public addToQueue(media: ITVShowMediaDTO): void {
    this.props.mediaQueue.push(media)
    this.updateEstimatedTimeToFinish()
  }

  /**
   * Remove media from the queue (by index)
   */
  public removeFromQueue(index: number): ITVShowMediaDTO | undefined {
    if (index < 0 || index >= this.props.mediaQueue.length) {
      return undefined
    }
    const removed = this.props.mediaQueue.splice(index, 1)[0]
    this.updateEstimatedTimeToFinish()
    return removed
  }

  /**
   * Clear the media queue
   */
  public clearQueue(): void {
    this.props.mediaQueue = []
    this.props.estimatedTimeToFinish = 0
  }

  /**
   * Get the first media in the queue without removing it
   */
  public peekQueue(): ITVShowMediaDTO | undefined {
    return this.props.mediaQueue.length > 0 ? this.props.mediaQueue[0] : undefined
  }

  /**
   * Get and remove the first media from the queue
   */
  public shiftQueue(): ITVShowMediaDTO | undefined {
    const media = this.props.mediaQueue.shift()
    this.updateEstimatedTimeToFinish()
    return media
  }

  /**
   * Check if the queue is empty
   */
  public isQueueEmpty(): boolean {
    return this.props.mediaQueue.length === 0
  }

  /**
   * Update the last used timestamp
   */
  public updateLastUsed(): void {
    this.props.lastUsed = new Date()
  }

  /**
   * Set the combined key (title identifier)
   */
  public setCombinedKey(combinedKey: string): void {
    this.props.combinedKey = combinedKey
  }

  /**
   * Update estimated time to finish based on current queue
   */
  private updateEstimatedTimeToFinish(): void {
    this.props.estimatedTimeToFinish = this.props.mediaQueue.reduce(
      (total, media) => total + media.duration,
      0
    )
  }

  /**
   * Get the DTO representation
   */
  public get DTO(): IStageDTO {
    return {
      id: this.id.value,
      stageNumber: this.props.stageNumber,
      status: this.props.status,
      mediaQueue: [...this.props.mediaQueue],
      estimatedTimeToFinish: this.props.estimatedTimeToFinish,
      lastUsed: this.props.lastUsed.toISOString(),
      combinedKey: this.props.combinedKey,
    }
  }
}
