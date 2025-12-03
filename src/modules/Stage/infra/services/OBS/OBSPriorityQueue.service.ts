import { Injectable, Logger } from '@nestjs/common'

/**
 * OBS Method Types enum
 * Lower number = higher priority
 */
export enum OBSMethodType {
  PREPARE_BASE_SCENES_SOURCE = 'PREPARE_BASE_SCENES_SOURCE',
  CHANGE_SYS_STAGE_FOCUS = 'CHANGE_SYS_STAGE_FOCUS',
  HIDE_MEDIA = 'HIDE_MEDIA',
  HIDE_SCENE_ITEM = 'HIDE_SCENE_ITEM',
  VACATE_STAGE = 'VACATE_STAGE',
  DELETE_SCENE = 'DELETE_SCENE',
  CREATE_SOURCE = 'CREATE_SOURCE',
  CREATE_SECONDARY_SOURCE = 'CREATE_SECONDARY_SOURCE',
  BATCH_MEDIUM_CREATE_SOURCE = 'BATCH_MEDIUM_CREATE_SOURCE',
  CHANGE_MEDIA_PROPERTIES = 'CHANGE_MEDIA_PROPERTIES',
  SHOW_MEDIA = 'SHOW_MEDIA',
  CHANGE_STAGE_FOCUS = 'CHANGE_STAGE_FOCUS',
  REMOVE_SOURCE = 'REMOVE_SOURCE',
}

/**
 * OBS Command interface
 */
interface IOBSCommand {
  methodType: OBSMethodType
  command: () => Promise<void>
  priority: number
  cooldown: number
}

/**
 * Method Type Metadata
 * Lower priority number = higher priority
 */
const methodTypeMetadata: Record<OBSMethodType, { priority: number; cooldown: number }> = {
  [OBSMethodType.PREPARE_BASE_SCENES_SOURCE]: {
    priority: 2,
    cooldown: 3,
  },
  [OBSMethodType.CHANGE_SYS_STAGE_FOCUS]: {
    priority: 5,
    cooldown: 1,
  },
  [OBSMethodType.HIDE_MEDIA]: {
    priority: 5, // High priority to ensure unwanted items don't remain
    cooldown: 1,
  },
  [OBSMethodType.HIDE_SCENE_ITEM]: {
    priority: 6, // High priority to ensure unwanted items don't remain
    cooldown: 1,
  },
  [OBSMethodType.VACATE_STAGE]: {
    priority: 7, // Higher than create sources to prevent sources being removed shortly after creation
    cooldown: 1,
  },
  [OBSMethodType.DELETE_SCENE]: {
    priority: 3, // High priority - delete scenes before creating new ones
    cooldown: 1,
  },
  [OBSMethodType.CREATE_SOURCE]: {
    priority: 10,
    cooldown: 1,
  },
  [OBSMethodType.CREATE_SECONDARY_SOURCE]: {
    priority: 11,
    cooldown: 1,
  },
  [OBSMethodType.CHANGE_MEDIA_PROPERTIES]: {
    priority: 16,
    cooldown: 2,
  },
  [OBSMethodType.SHOW_MEDIA]: {
    priority: 18,
    cooldown: 1,
  },
  [OBSMethodType.CHANGE_STAGE_FOCUS]: {
    priority: 19,
    cooldown: 1,
  },
  [OBSMethodType.REMOVE_SOURCE]: {
    priority: 20,
    cooldown: 1,
  },
  [OBSMethodType.BATCH_MEDIUM_CREATE_SOURCE]: {
    priority: 10,
    cooldown: 4,
  },
}

/**
 * OBS Priority Queue Service
 * Batches OBS commands to avoid overwhelming WebSocket
 * Ported from: ../vcmanda/src/app/core/workers/obsPQ.js
 *
 * Simplified version - can be enhanced with cron jobs and MinHeap later
 */
@Injectable()
export class OBSPriorityQueueService {
  private readonly logger = new Logger(OBSPriorityQueueService.name)
  private queues: Map<OBSMethodType, IOBSCommand[]>
  private processing: boolean = false
  private lastProcessedTime: Date | null = null

  constructor() {
    this.queues = new Map()
    // Initialize queues for each method type
    Object.values(OBSMethodType).forEach((methodType) => {
      this.queues.set(methodType, [])
    })
  }

  /**
   * Push a command to the queue
   * @param methodType Type of OBS method
   * @param command Function to execute
   */
  pushToQueue(methodType: OBSMethodType, command: () => Promise<void>): void {
    const metadata = methodTypeMetadata[methodType]
    if (!metadata) {
      throw new Error(`OBS Priority Queue - method type "${methodType}" not found`)
    }

    const queue = this.queues.get(methodType)
    if (!queue) {
      throw new Error(`Queue for method type "${methodType}" not initialized`)
    }

    queue.push({
      methodType,
      command,
      priority: metadata.priority,
      cooldown: metadata.cooldown,
    })

    this.logger.debug(`Pushed command to queue: ${methodType}`)

    // Start processing if not already processing
    // Don't await - let it process in background
    if (!this.processing) {
      this.processQueue().catch((error) => {
        this.logger.error('Error in queue processing', error)
      })
    }
  }

  /**
   * Process the queue
   * Executes commands in priority order with cooldown between commands
   */
  async processQueue(): Promise<void> {
    if (this.processing) {
      return
    }

    this.processing = true

    try {
      while (this.hasCommands()) {
        // Get next command (highest priority = lowest number)
        const nextCommand = this.getNextCommand()

        if (!nextCommand) {
          break
        }

        // Wait for cooldown if needed
        if (this.lastProcessedTime) {
          const timeSinceLastProcess = Date.now() - this.lastProcessedTime.getTime()
          const cooldownMs = nextCommand.cooldown * 1000

          if (timeSinceLastProcess < cooldownMs) {
            const waitTime = cooldownMs - timeSinceLastProcess
            await this.sleep(waitTime)
          }
        }

        // Execute command
        try {
          await nextCommand.command()
          this.lastProcessedTime = new Date()
          this.logger.debug(`Executed command: ${nextCommand.methodType}`)
        } catch (error) {
          this.logger.error(`Error executing command: ${nextCommand.methodType}`, error)
          // Continue with next command even if one fails
        }
      }
    } finally {
      this.processing = false
    }
  }

  /**
   * Get the next command to execute (highest priority)
   * @returns Next command or null if no commands available
   */
  private getNextCommand(): IOBSCommand | null {
    let nextCommand: IOBSCommand | null = null
    let nextMethodType: OBSMethodType | null = null
    let highestPriority = Infinity

    // Find command with highest priority (lowest number)
    for (const [methodType, queue] of this.queues.entries()) {
      if (queue.length > 0) {
        const command = queue[0]
        if (command.priority < highestPriority) {
          highestPriority = command.priority
          nextCommand = command
          nextMethodType = methodType
        }
      }
    }

    // Remove command from queue
    if (nextCommand && nextMethodType) {
      const queue = this.queues.get(nextMethodType)
      if (queue) {
        queue.shift()
      }
    }

    return nextCommand
  }

  /**
   * Check if there are any commands in the queues
   * @returns True if there are commands, false otherwise
   */
  private hasCommands(): boolean {
    for (const queue of this.queues.values()) {
      if (queue.length > 0) {
        return true
      }
    }
    return false
  }

  /**
   * Sleep utility
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Clear all queues
   */
  clearQueues(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0
    }
    this.logger.log('Cleared all OBS priority queues')
  }

  /**
   * Get queue size for a specific method type
   * @param methodType Method type
   * @returns Queue size
   */
  getQueueSize(methodType: OBSMethodType): number {
    const queue = this.queues.get(methodType)
    return queue ? queue.length : 0
  }

  /**
   * Get total queue size across all method types
   * @returns Total number of queued commands
   */
  getTotalQueueSize(): number {
    let total = 0
    for (const queue of this.queues.values()) {
      total += queue.length
    }
    return total
  }

  /**
   * Wait for all queued commands to be processed
   * @param timeout Maximum time to wait in milliseconds (default: 30000 = 30 seconds)
   * @returns Promise that resolves when queue is empty or timeout is reached
   */
  async waitForQueueEmpty(timeout: number = 30000): Promise<void> {
    const startTime = Date.now()
    while (this.getTotalQueueSize() > 0 || this.processing) {
      if (Date.now() - startTime > timeout) {
        this.logger.warn(`Queue wait timeout after ${timeout}ms`)
        break
      }
      await this.sleep(100) // Check every 100ms
    }
  }
}
