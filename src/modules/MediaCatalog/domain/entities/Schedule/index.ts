import { Entity } from '#ddd/primitives/entity'
import { DomainEntity } from '#ddd/primitives/domain-entity'
import { DomainID } from '#ddd/primitives/domain-id'
import { ITVShowMediaDTO } from '../TVShowMedia/interfaces'
import { IScheduleDTO, MediaQueue } from './interfaces'

interface IScheduleProps extends DomainEntity {
  preStart: MediaQueue
  toPlay: MediaQueue
  lastScheduledFromTitle: Map<string, ITVShowMediaDTO>
  unstarted: boolean
}

export class Schedule extends Entity<IScheduleProps> {
  private constructor(props: IScheduleProps) {
    super(props)
  }

  public static create(dto: IScheduleDTO): Schedule {
    const lastScheduledMap = new Map<string, ITVShowMediaDTO>()
    if (dto.lastScheduledFromTitle) {
      Object.entries(dto.lastScheduledFromTitle).forEach(([titleId, media]) => {
        lastScheduledMap.set(titleId, media)
      })
    }

    return new Schedule({
      id: dto.id ? DomainID.create(dto.id) : DomainID.create(),
      preStart: dto.preStart ? [...dto.preStart] : [],
      toPlay: dto.toPlay ? [...dto.toPlay] : [],
      lastScheduledFromTitle: lastScheduledMap,
      unstarted: dto.unstarted !== undefined ? dto.unstarted : true,
    })
  }

  public get preStart(): MediaQueue {
    return [...this.props.preStart]
  }

  public get toPlay(): MediaQueue {
    return [...this.props.toPlay]
  }

  public get lastScheduledFromTitle(): Map<string, ITVShowMediaDTO> {
    return new Map(this.props.lastScheduledFromTitle)
  }

  public get unstarted(): boolean {
    return this.props.unstarted
  }

  public addToPreStart(media: ITVShowMediaDTO): void {
    this.props.preStart.push(media)
  }

  public addToToPlay(media: ITVShowMediaDTO): void {
    this.props.toPlay.push(media)
  }

  /**
   * Shift (remove and return) the next item from the schedule
   * @returns Next media item or undefined if empty
   */
  public shiftToPlay(): ITVShowMediaDTO | undefined {
    return this.props.toPlay.shift()
  }

  /**
   * Peek at the next items from the schedule
   * @param count Number of items to peek
   * @returns Array of media items
   */
  public peekToPlay(count: number = 1): MediaQueue {
    return this.props.toPlay.slice(0, count)
  }

  public isToPlayEmpty(): boolean {
    return this.props.toPlay.length === 0
  }

  public updateLastScheduled(titleId: string, media: ITVShowMediaDTO): void {
    this.props.lastScheduledFromTitle.set(titleId, media)
  }

  public getLastScheduled(titleId: string): ITVShowMediaDTO | undefined {
    return this.props.lastScheduledFromTitle.get(titleId)
  }

  public markAsStarted(): void {
    this.props.unstarted = false
  }

  public get DTO(): IScheduleDTO {
    const lastScheduledRecord: Record<string, ITVShowMediaDTO> = {}
    this.props.lastScheduledFromTitle.forEach((media, titleId) => {
      lastScheduledRecord[titleId] = media
    })

    return {
      id: this.id.value,
      preStart: [...this.props.preStart],
      toPlay: [...this.props.toPlay],
      lastScheduledFromTitle: lastScheduledRecord,
      unstarted: this.props.unstarted,
    }
  }
}
