import { ISubMediaDTO } from "./SubMedia/interfaces"


export interface ICollection {
	title: string
	order: number
	length: number
	submediaList: ISubMediaDTO[]
}