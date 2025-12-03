import { AggregateRoot } from '#ddd/primitives/aggregate-root'
import { DomainID } from '#ddd/primitives/domain-id'
import { Playlist } from '../Playlist'

export interface IMediaTitle {
  title: string
  basePlaylist: Playlist
  type: MediaTitleType
  // setBasePlaylist: (basePlaylist: Playlist) => void
}

type MediaTitleType = 'tvshow' | 'movie'

interface IMediaTitleProps {
  id?: DomainID
  title: string
  type: MediaTitleType
  basePlaylist: Playlist
}

export class MediaTitle extends AggregateRoot<IMediaTitle> {
  constructor(props: IMediaTitleProps) {
    super(props)
  }

  public static create(title: string, basePlaylist: Playlist, type: MediaTitleType, id?: DomainID) {
    return new MediaTitle({ id, title, basePlaylist, type })
  }

  public get title(): string {
    return this.props.title
  }

  public get type(): MediaTitleType {
    return this.props.type
  }

  public get basePlaylist(): Playlist {
    return this.props.basePlaylist
  }
}
