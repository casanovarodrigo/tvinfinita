import { Stage } from '../entities/Stage'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

/**
 * StageManager Domain Service
 * Manages stage allocation, availability, and queue operations
 */
export class StageManagerService {
  private static readonly MAX_STAGES = 4
  private static stageQueue: Stage[] = []

  /**
   * Initialize all stages (1-4) as available
   * @returns Array of initialized stages
   */
  public static initializeStages(): Stage[] {
    const stages: Stage[] = []
    for (let i = 1; i <= this.MAX_STAGES; i++) {
      stages.push(
        Stage.create({
          stageNumber: i,
          status: 'available',
          mediaQueue: [],
          estimatedTimeToFinish: 0,
          lastUsed: new Date(),
          combinedKey: '',
        })
      )
    }
    return stages
  }

  /**
   * Get the first available stage from a collection of stages
   * @param stages Array of stages to search
   * @returns First available stage or undefined if none available
   */
  public static getAvailableStage(stages: Stage[]): Stage | undefined {
    return stages.find((stage) => stage.status === 'available')
  }

  /**
   * Get all available stages from a collection
   * @param stages Array of stages to search
   * @returns Array of available stages
   */
  public static getAvailableStages(stages: Stage[]): Stage[] {
    return stages.filter((stage) => stage.status === 'available')
  }

  /**
   * Set a stage to "in_use" and assign a media queue
   * @param stage Stage to set in use
   * @param mediaQueue Media queue to assign to the stage
   */
  public static setStageInUse(stage: Stage, mediaQueue: ITVShowMediaDTO[]): void {
    stage.setMediaQueue(mediaQueue)
    stage.setStatus('in_use')
    stage.updateLastUsed()
  }

  /**
   * Set a stage to "on_screen" (currently displaying)
   * @param stage Stage to set on screen
   */
  public static setStageOnScreen(stage: Stage): void {
    stage.setStatus('on_screen')
    stage.updateLastUsed()
  }

  /**
   * Vacate a stage (set to available and clear queue)
   * @param stage Stage to vacate
   */
  public static vacateStage(stage: Stage): void {
    stage.clearQueue()
    stage.setStatus('available')
    stage.setCombinedKey('')
    stage.updateLastUsed()
  }

  /**
   * Add a stage to the queue (for scheduling purposes)
   * @param stage Stage to add to queue
   */
  public static addStageToQueue(stage: Stage): void {
    // Check if stage is already in queue
    const existingIndex = this.stageQueue.findIndex((s) => s.stageNumber === stage.stageNumber)
    if (existingIndex === -1) {
      this.stageQueue.push(stage)
    }
  }

  /**
   * Remove and return the next stage from the queue
   * @returns Next stage in queue or undefined if queue is empty
   */
  public static popNextStageInQueue(): Stage | undefined {
    return this.stageQueue.shift()
  }

  /**
   * Get the next stage from the queue without removing it
   * @returns Next stage in queue or undefined if queue is empty
   */
  public static peekNextStageInQueue(): Stage | undefined {
    return this.stageQueue.length > 0 ? this.stageQueue[0] : undefined
  }

  /**
   * Remove a specific stage from the queue
   * @param stageNumber Stage number to remove
   * @returns True if stage was removed, false if not found
   */
  public static removeStageFromQueue(stageNumber: number): boolean {
    const index = this.stageQueue.findIndex((s) => s.stageNumber === stageNumber)
    if (index !== -1) {
      this.stageQueue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Clear the stage queue
   */
  public static clearStageQueue(): void {
    this.stageQueue = []
  }

  /**
   * Get the current stage queue
   * @returns Copy of the stage queue
   */
  public static getStageQueue(): Stage[] {
    return [...this.stageQueue]
  }

  /**
   * Check if the stage queue is empty
   * @returns True if queue is empty, false otherwise
   */
  public static isStageQueueEmpty(): boolean {
    return this.stageQueue.length === 0
  }

  /**
   * Find a stage by stage number
   * @param stages Array of stages to search
   * @param stageNumber Stage number to find
   * @returns Stage with matching number or undefined
   */
  public static findStageByNumber(stages: Stage[], stageNumber: number): Stage | undefined {
    return stages.find((stage) => stage.stageNumber === stageNumber)
  }

  /**
   * Get stages by status
   * @param stages Array of stages to search
   * @param status Status to filter by
   * @returns Array of stages with matching status
   */
  public static getStagesByStatus(stages: Stage[], status: 'available' | 'in_use' | 'on_screen'): Stage[] {
    return stages.filter((stage) => stage.status === status)
  }
}

