import * as winston from 'winston'
import * as fs from 'fs'
import * as path from 'path'
import { ILoggerConfig } from '../config/logger.config'

// winston-daily-rotate-file is a CommonJS module, use require for proper interop
// eslint-disable-next-line @typescript-eslint/no-require-imports
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

  // Convert color name to ANSI escape code
  const getAnsiColor = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
      blue: '\x1b[34m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      green: '\x1b[32m',
    }
    return colorMap[colorName] || '\x1b[0m'
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
      const loggerColor = getAnsiColor(loggerColors[type])
      const tag = loggerColor + loggerTags[type] + '\x1b[0m'

      // Level color: red/yellow/green for errors/warnings, logger color for others
      let levelDisplay = level
      if (level === 'error') {
        levelDisplay = getAnsiColor('red') + level + '\x1b[0m' // Red
      } else if (level === 'warn') {
        levelDisplay = getAnsiColor('yellow') + level + '\x1b[0m' // Yellow
      } else if (level === 'info' && meta.success) {
        levelDisplay = getAnsiColor('green') + level + '\x1b[0m' // Green for success
      } else {
        // Use logger's normal color for info/debug/verbose
        levelDisplay = loggerColor + level + '\x1b[0m'
      }

      // Build meta string with detailed error information
      let metaStr = ''
      if (Object.keys(meta).length > 0 && !meta.success) {
        // Special handling for error objects - extract detailed information
        if (meta.error) {
          const error = meta.error as any
          const errorDetails: any = {}

          // Extract error properties
          if (error && typeof error === 'object') {
            if (error.message) errorDetails.message = error.message
            if (error.code !== undefined) errorDetails.code = error.code
            if (error.name) errorDetails.name = error.name
            if (error.stack) errorDetails.stack = error.stack

            // Include any other error properties
            Object.keys(error).forEach((key) => {
              if (!['message', 'code', 'name', 'stack'].includes(key)) {
                errorDetails[key] = error[key]
              }
            })
          }

          // Include other meta properties (excluding error)
          const otherMeta = { ...meta }
          delete otherMeta.error
          const allMeta = { error: errorDetails, ...otherMeta }

          metaStr = ' ' + JSON.stringify(allMeta, null, 2)
        } else {
          metaStr = ' ' + JSON.stringify(meta, null, 2)
        }
      }

      // Format: [TAG] LEVEL - date ...rest...
      return `${tag} ${levelDisplay} - ${timestamp}${contextStr ? ' ' + contextStr : ''} ${message}${metaStr}`
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
