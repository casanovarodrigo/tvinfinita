import { DomainEntity } from '#ddd/primitives/domain-entity'
import { Entity } from '#ddd/primitives/entity'
import { ITVShowMediaDTO } from '../TVShowMedia/interfaces'
import { ICollection } from '../interfaces'

type createMap<T> = (baseOrderMap: T[]) => Map<number, T>

// export interface IPlaylist extends DomainEntity {
// 	submediaMap: Map<Number, ISubMediaDTO>
// 	collectionMap: Map<Number, ICollection>
// 	title: string
// 	// createSubmediaAnchorMap: (baseOrderMap: ISubMediaDTO[]) => Map<Number, ISubMediaDTO>
// 	createSubmediaAnchorMap: createMap<ISubMediaDTO>
// 	getSubmediaMap: () => Map<Number, ISubMediaDTO>
// 	getSubmediaMapAsArray: () => ISubMediaDTO[]
// 	// createCollectionMap: (baseOrderMap: ICollection[]) => Map<Number, ICollection>
// 	createCollectionMap: createMap<ICollection>
// 	getCollectionMap: () => Map<Number, ICollection>
// 	getCollectionMapAsArray: () => ICollection[]
// 	updateTitle: (title: string) => void
// }

interface IPlaylistProps extends DomainEntity {
  title: string
  submediaMap: Map<number, ITVShowMediaDTO>
  collectionsMap?: Map<number, ICollection>
}

export interface IPlaylistDTO {
  title: string
  submedia: ITVShowMediaDTO[]
  collections?: ICollection[]
}

export class Playlist extends Entity<IPlaylistProps> {
  constructor(props: IPlaylistProps) {
    super(props)
  }

  public static create({ title, submedia, collections }: IPlaylistDTO) {
    const submediaMap = Playlist.arrayToMap<ITVShowMediaDTO>(submedia)
    const collectionsMap = collections ? Playlist.arrayToMap<ICollection>(collections) : null

    return new Playlist({ title, submediaMap, collectionsMap })
  }

  public getSubmediaMap(): Map<number, ITVShowMediaDTO> {
    return this.props.submediaMap
  }

  public getCollectionMap(): Map<number, ICollection> | undefined {
    return this.props.collectionsMap
  }

  public getSubmediaMapAsArray(): ITVShowMediaDTO[] {
    return Playlist.mapToArray(this.props.submediaMap)
  }

  public getCollectionMapAsArray(): ICollection[] | undefined {
    return this.props.collectionsMap ? Playlist.mapToArray(this.props.collectionsMap) : undefined
  }

  static arrayToMap<T>(arr?: T[]): Map<number, T> {
    return new Map(arr.map((item: T, index: number) => [index, item]))
  }

  static mapToArray<T>(map: Map<number, T>): T[] {
    return Array.from(map.values())
  }
}
