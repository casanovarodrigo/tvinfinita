import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OBSWebSocket from 'obs-websocket-js'

/**
 * OBS WebSocket Service
 * Provides connection management and OBS API operations
 */
@Injectable()
export class OBSService implements OnModuleInit {
  private readonly logger = new Logger(OBSService.name)
  private obs: OBSWebSocket | null = null
  private isConnected = false
  private connectionPromise: Promise<OBSWebSocket> | null = null

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect()
  }

  /**
   * Connect to OBS WebSocket
   * @returns Promise that resolves when connected
   */
  async connect(): Promise<OBSWebSocket> {
    // If already connected, return existing connection
    if (this.isConnected && this.obs) {
      return this.obs
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    // Start new connection
    this.connectionPromise = this.attemptConnection()
    return this.connectionPromise
  }

  private async attemptConnection(): Promise<OBSWebSocket> {
    const address = this.configService.get<string>('OBS_ADDRESS', 'localhost')
    const port = this.configService.get<string>('OBS_PORT', '4455')
    const password = this.configService.get<string>('OBS_PSWD', '')

    try {
      this.obs = new OBSWebSocket()

      // Set up error handlers
      this.obs.on('ConnectionClosed', () => {
        this.logger.warn('OBS WebSocket connection closed')
        this.isConnected = false
        this.obs = null
      })

      this.obs.on('ConnectionError', (error) => {
        this.logger.error('OBS WebSocket connection error', error)
        this.isConnected = false
        this.obs = null
      })

      // Connect - obs-websocket-js v5 expects full WebSocket URL with protocol
      const connectionUrl = `ws://${address}:${port}`
      await this.obs.connect(connectionUrl, password)

      this.isConnected = true
      this.connectionPromise = null
      this.logger.log(`Connected to OBS at ${address}:${port}`)

      return this.obs
    } catch (error) {
      this.logger.error(`Failed to connect to OBS at ${address}:${port}`, error)
      this.isConnected = false
      this.obs = null
      this.connectionPromise = null
      throw error
    }
  }

  /**
   * Reconnect to OBS WebSocket
   */
  async reconnect(): Promise<OBSWebSocket> {
    this.logger.log('Reconnecting to OBS...')
    if (this.obs) {
      try {
        await this.obs.disconnect()
      } catch (error) {
        this.logger.warn('Error disconnecting from OBS', error)
      }
    }
    this.isConnected = false
    this.obs = null
    this.connectionPromise = null
    return this.connect()
  }

  /**
   * Get the OBS WebSocket instance
   * Automatically reconnects if disconnected
   * @returns OBS WebSocket instance
   * @throws Error if connection fails after retry
   */
  async getSocket(): Promise<OBSWebSocket> {
    if (!this.isConnected || !this.obs) {
      this.logger.warn('OBS WebSocket not connected, attempting to reconnect...')
      try {
        return await this.connect()
      } catch (error) {
        this.logger.error('Failed to reconnect to OBS', error)
        throw new Error(
          'OBS WebSocket connection failed. Please ensure OBS Studio is running and WebSocket server is enabled.'
        )
      }
    }
    return this.obs
  }

  /**
   * Check if connected to OBS
   */
  isOBSConnected(): boolean {
    return this.isConnected && this.obs !== null
  }

  /**
   * Disconnect from OBS
   */
  async disconnect(): Promise<void> {
    if (this.obs) {
      try {
        await this.obs.disconnect()
        this.logger.log('Disconnected from OBS')
      } catch (error) {
        this.logger.warn('Error disconnecting from OBS', error)
      }
    }
    this.isConnected = false
    this.obs = null
    this.connectionPromise = null
  }
}
