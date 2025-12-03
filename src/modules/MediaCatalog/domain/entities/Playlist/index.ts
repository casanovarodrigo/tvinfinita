import { DomainEntity } from '#ddd/primitives/domain-entity'
import { Entity } from '#ddd/primitives/entity'
import { ITVShowMediaDTO } from '../TVShowMedia/interfaces'

interface IPlaylistProps extends DomainEntity {
  title: string
  mediaTitleId: string
  submediaMap: Map<number, ITVShowMediaDTO>
  isAnchor: boolean
}

export interface IPlaylistDTO {
  title: string
  isAnchor: boolean
  mediaTitleId: string
  submedia: ITVShowMediaDTO[]
}

export class Playlist extends Entity<IPlaylistProps> {
  constructor(props: IPlaylistProps) {
    super(props)
  }

  public static create({ title, submedia, isAnchor = false, mediaTitleId = null }: IPlaylistDTO) {
    const submediaMap = Playlist.arrayToMap<ITVShowMediaDTO>(submedia)

    return new Playlist({ title, submediaMap, isAnchor, mediaTitleId })
  }

  public getSubmediaMap(): Map<number, ITVShowMediaDTO> {
    return this.props.submediaMap
  }

  public getSubmediaMapAsArray(): ITVShowMediaDTO[] {
    return Playlist.mapToArray(this.props.submediaMap)
  }

  public get title(): string {
    return this.props.title
  }

  public get isAnchor(): boolean {
    return this.props.isAnchor
  }

  public get mediaTitleId(): string {
    return this.props.mediaTitleId
  }

  static arrayToMap<T>(arr?: T[]): Map<number, T> {
    return new Map(arr.map((item: T, index: number) => [index, item]))
  }

  static mapToArray<T>(map: Map<number, T>): T[] {
    return Array.from(map.values())
  }
}
