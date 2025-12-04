import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface ILoggerConfig {
  general: {
    maxSize: number // bytes
    maxFiles: number
    logFile: string
  }
  cronjob: {
    maxSize: number // bytes
    maxFiles: number
    logFile: string
  }
  director: {
    maxSize: number // bytes
    maxFiles: number
    logFile: string
  }
  logLevel: string
  logsDir: string
}

@Injectable()
export class LoggerConfig {
  private readonly config: ILoggerConfig

  constructor(private configService: ConfigService) {
    this.config = {
      general: {
        maxSize: this.parseSize(this.configService.get<string>('GENERAL_LOG_MAX_SIZE', '5MB')),
        maxFiles: this.configService.get<number>('GENERAL_LOG_MAX_FILES', 5),
        logFile: this.configService.get<string>('GENERAL_LOG_FILE', 'general.log'),
      },
      cronjob: {
        maxSize: this.parseSize(this.configService.get<string>('CRONJOB_LOG_MAX_SIZE', '2MB')),
        maxFiles: this.configService.get<number>('CRONJOB_LOG_MAX_FILES', 3),
        logFile: this.configService.get<string>('CRONJOB_LOG_FILE', 'cronjob.log'),
      },
      director: {
        maxSize: this.parseSize(this.configService.get<string>('DIRECTOR_LOG_MAX_SIZE', '5MB')),
        maxFiles: this.configService.get<number>('DIRECTOR_LOG_MAX_FILES', 5),
        logFile: this.configService.get<string>('DIRECTOR_LOG_FILE', 'director.log'),
      },
      logLevel: this.configService.get<string>('LOG_LEVEL', 'info'),
      logsDir: this.configService.get<string>('LOGS_DIR', 'logs'),
    }
  }

  getConfig(): ILoggerConfig {
    return this.config
  }

  private parseSize(size: string): number {
    const units: { [key: string]: number } = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    }

    const match = size.match(/^(\d+)([A-Z]+)$/i)
    if (!match) {
      return 5 * 1024 * 1024 // Default to 5MB
    }

    const value = parseInt(match[1], 10)
    const unit = match[2].toUpperCase()
    return value * (units[unit] || 1)
  }
}
