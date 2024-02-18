import { ITVShowMediaDTO } from "./TVShowMedia/interfaces"


export interface ICollection {
	title: string
	order: number
	length: number
	submediaList: ITVShowMediaDTO[]
}