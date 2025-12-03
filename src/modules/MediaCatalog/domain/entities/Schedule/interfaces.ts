import { ITVShowMediaDTO } from '../TVShowMedia/interfaces'

export type { ITVShowMediaDTO }
export type MediaQueue = ITVShowMediaDTO[]

export interface IScheduleDTO {
  id?: string
  preStart: MediaQueue
  toPlay: MediaQueue
  lastScheduledFromTitle: Record<string, ITVShowMediaDTO>
  unstarted: boolean
}

export interface IScheduleOptions {
  timespan: number // Duration in seconds to fill the schedule
  titles: Array<{
    id: string
    title: string
    basePlaylist: {
      submedia: ITVShowMediaDTO[]
    }
  }>
}

