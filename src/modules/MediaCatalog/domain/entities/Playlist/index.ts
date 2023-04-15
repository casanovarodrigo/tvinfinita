import { ISubMediaDTO } from "../SubMedia/interfaces"
import { ICollection } from "../interfaces"

export interface IPlaylist {
	submediaMap: Map<Number, ISubMediaDTO>
	collectionMap: Map<Number, ICollection>
	title: string
	createSubmediaAnchorMap: (baseOrderMap: ISubMediaDTO[]) => Map<Number, ISubMediaDTO>
	getSubmediaMap: () => Map<Number, ISubMediaDTO>
	getSubmediaMapAsArray: () => ISubMediaDTO[]
	createCollectionMap: (baseOrderMap: ICollection[]) => Map<Number, ICollection>
	getCollectionMap: () => Map<Number, ICollection>
	getCollectionMapAsArray: () => ICollection[]
	updateTitle: (title: string) => void
}

export class Playlist implements IPlaylist {
	public readonly submediaMap: Map<Number, ISubMediaDTO>
	public readonly collectionMap: Map<Number, ICollection> | undefined
	public title: string

	constructor(
		title: string,
		baseOrderList: ISubMediaDTO[],
		collectionList?: ICollection[]
	){
		this.submediaMap = this.createSubmediaAnchorMap(baseOrderList)
		this.title = title
		
		if (collectionList)
			this.collectionMap = this.createCollectionMap(collectionList)
	}

	public static create(
		title: string,
		baseOrderList: ISubMediaDTO[],
		collectionList?: ICollection[]
	){
		return new Playlist(title, baseOrderList, collectionList)
	}

	public updateTitle(title: string): void {
		this.title = title
	}

	public createSubmediaAnchorMap(baseOrderMap: ISubMediaDTO[]): Map<Number, ISubMediaDTO> {
		return new Map(baseOrderMap.map((item: ISubMediaDTO, index: number) => [index, item]))
	}

	public createCollectionMap(baseOrderMap: ICollection[]): Map<Number, ICollection> {
		return new Map(baseOrderMap.map((item: ICollection, index: number) => [index, item]))
	}

	public getSubmediaMap(): Map<Number, ISubMediaDTO> {
		return this.submediaMap
	}

	public getSubmediaMapAsArray(): ISubMediaDTO[] {
		return Array.from(this.submediaMap.values())
	}

	public getCollectionMap(): Map<Number, ICollection> | undefined {
		return this.collectionMap
	}

	public getCollectionMapAsArray(): ICollection[] | undefined {
		return this.collectionMap? Array.from(this.collectionMap.values()) : undefined
	}
}