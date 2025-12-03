import { AggregateRoot } from '#ddd/primitives/aggregate-root'
import { Playlist } from '../Playlist'

export interface IMediaTitle {
  title: string
  basePlaylist: Playlist
  type: MediaTitleType
  // setBasePlaylist: (basePlaylist: Playlist) => void
}

type MediaTitleType = 'tvshow' | 'movie'

interface IMediaTitleProps {
  title: string
  type: MediaTitleType
  basePlaylist: Playlist
}

export class MediaTitle extends AggregateRoot<IMediaTitle> {
  constructor(props: IMediaTitleProps) {
    super(props)
  }

  public static create(title: string, basePlaylist: Playlist, type: MediaTitleType) {
    return new MediaTitle({ title, basePlaylist, type })
  }
}
