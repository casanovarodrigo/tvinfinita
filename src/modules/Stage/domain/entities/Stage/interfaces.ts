import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

export type StageStatus = 'available' | 'in_use' | 'on_screen'

export interface IStageDTO {
  id?: string
  stageNumber: number
  status: StageStatus
  mediaQueue: ITVShowMediaDTO[]
  estimatedTimeToFinish: number
  lastUsed: Date | string
  combinedKey: string
}

