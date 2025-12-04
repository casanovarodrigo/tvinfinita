import * as winston from 'winston'
import * as fs from 'fs'
import * as path from 'path'
import { ILoggerConfig } from '../config/logger.config'

// winston-daily-rotate-file is a CommonJS module, use require for proper interop
const DailyRotateFile = require('winston-daily-rotate-file')

export enum LoggerType {
  GENERAL = 'GENERAL',
  CRONJOB = 'CRONJOB',
  DIRECTOR = 'DIRECTOR',
}

interface ILoggerFactoryOptions {
  type: LoggerType
  config: ILoggerConfig
  context?: string
}

/**
 * Creates a Winston logger instance with console and file transports
 * @param options Logger configuration options
 * @returns Configured Winston logger instance
 */
export function createLogger(options: ILoggerFactoryOptions): winston.Logger {
  const { type, config, context } = options

  // Ensure logs directory exists
  const logsDir = path.resolve(config.logsDir)
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  // Get logger-specific config
  const loggerConfig =
    type === LoggerType.GENERAL
      ? config.general
      : type === LoggerType.CRONJOB
        ? config.cronjob
        : config.director

  // Define colors for each logger type (normal logs - not red/yellow/green)
  const loggerColors: Record<LoggerType, string> = {
    [LoggerType.GENERAL]: 'cyan',
    [LoggerType.CRONJOB]: 'magenta',
    [LoggerType.DIRECTOR]: 'blue',
  }

  // Define tags for each logger type
  const loggerTags: Record<LoggerType, string> = {
    [LoggerType.GENERAL]: '[GENERAL]',
    [LoggerType.CRONJOB]: '[CRONJOB]',
    [LoggerType.DIRECTOR]: '[DIRECTOR]',
  }

  // Custom format for console output
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const { timestamp, level, message, context: ctx, ...meta } = info

      // Build context string
      const contextStr = ctx ? `[${ctx}]` : ''

      // Tag with color (logger's normal color)
      const tagColorMap: Record<LoggerType, string> = {
        [LoggerType.GENERAL]: '\x1b[36m', // cyan
        [LoggerType.CRONJOB]: '\x1b[35m', // magenta
        [LoggerType.DIRECTOR]: '\x1b[34m', // blue
      }
      const tag = tagColorMap[type] + loggerTags[type] + '\x1b[0m'

      // Level color: red/yellow/green for errors/warnings, logger color for others
      let levelDisplay = level
      if (level === 'error') {
        levelDisplay = '\x1b[31m' + level + '\x1b[0m' // Red
      } else if (level === 'warn') {
        levelDisplay = '\x1b[33m' + level + '\x1b[0m' // Yellow
      } else if (level === 'info' && meta.success) {
        levelDisplay = '\x1b[32m' + level + '\x1b[0m' // Green for success
      } else {
        // Use logger's normal color for info/debug/verbose
        levelDisplay = tagColorMap[type] + level + '\x1b[0m'
      }

      // Build meta string
      const metaStr = Object.keys(meta).length > 0 && !meta.success ? ' ' + JSON.stringify(meta, null, 0) : ''

      return `${timestamp} ${tag} ${levelDisplay}${contextStr ? ' ' + contextStr : ''} ${message}${metaStr}`
    })
  )

  // File format (JSON for structured logging)
  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  )

  // Console transport
  const consoleTransport = new winston.transports.Console({
    format: consoleFormat,
    level: config.logLevel,
  })

  // File transport with rotation
  const fileTransport = new DailyRotateFile({
    filename: `${config.logsDir}/${loggerConfig.logFile.replace('.log', '-%DATE%.log')}`,
    datePattern: 'YYYY-MM-DD',
    maxSize: `${loggerConfig.maxSize / (1024 * 1024)}m`, // Convert bytes to MB
    maxFiles: `${loggerConfig.maxFiles}d`,
    format: fileFormat,
    level: config.logLevel,
  })

  // Create logger
  const logger = winston.createLogger({
    level: config.logLevel,
    format: fileFormat,
    transports: [consoleTransport, fileTransport],
    defaultMeta: context ? { context } : {},
  })

  return logger
}
