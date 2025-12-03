import { Injectable, Logger } from '@nestjs/common'
import { OBSService } from '../OBS.service'

/**
 * Output interface
 */
export interface IOutput {
  outputName: string
  outputKind: string
  outputWidth?: number
  outputHeight?: number
  outputActive?: boolean
  outputFlags?: {
    rawValue: number
    flags: string[]
  }
}

/**
 * Output Service
 * Manages OBS outputs (streaming, recording, etc.)
 * Ported from: ../vcmanda/src/app/models/obs/output.js
 */
@Injectable()
export class OutputService {
  private readonly logger = new Logger(OutputService.name)

  constructor(private readonly obsService: OBSService) {}

  /**
   * Get list of all outputs
   * @returns Array of outputs
   */
  async getList(): Promise<IOutput[]> {
    try {
      const obs = await this.obsService.getSocket()
      const result = await obs.call('GetOutputList')
      return (result.outputs as unknown as IOutput[]) || []
    } catch (error) {
      this.logger.error('Error getting outputs list', error)
      throw error
    }
  }
}
