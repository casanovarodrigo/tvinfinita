import { Playlist } from "../Playlist"


export interface IMediaTitle {
	title: string
	basePlaylist: Playlist
	// setBasePlaylist: (basePlaylist: Playlist) => void
}

export class MediaTitle implements IMediaTitle {
	public readonly basePlaylist: Playlist
	public title: string

	constructor(title: string, basePlaylist: Playlist){
		this.title = title
		this.basePlaylist = basePlaylist
	}

	public static create(title: string, basePlaylist: Playlist){
		return new MediaTitle(title, basePlaylist)
	}
}