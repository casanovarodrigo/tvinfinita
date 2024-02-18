import { AggregateRoot } from '#ddd/primitives/aggregate-root'
import { Playlist } from '../Playlist'

export interface IMediaTitle {
  title: string
  basePlaylist: Playlist
  // setBasePlaylist: (basePlaylist: Playlist) => void
}

interface IMediaTitleProps {
  title: string
  basePlaylist: Playlist
}

export class MediaTitle extends AggregateRoot<IMediaTitle> {
  constructor(props: IMediaTitleProps) {
    super(props)
  }

  public static create(title: string, basePlaylist: Playlist) {
    return new MediaTitle({ title, basePlaylist })
  }
}
