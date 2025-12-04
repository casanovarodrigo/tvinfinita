import { Injectable, LoggerService as INestLoggerService } from '@nestjs/common'
import * as winston from 'winston'
import { LoggerConfig } from '../config/logger.config'
import { createLogger, LoggerType } from '../factories/logger.factory'

/**
 * LoggerService provides Winston logger instances for different purposes
 * - General logger (default)
 * - Cronjob logger (for cronjob operations)
 * - Director logger (for director/scene operations)
 *
 * Usage:
 * ```typescript
 * constructor(private loggerService: LoggerService) {
 *   this.logger = this.loggerService.getLogger(ClassName.name)
 *   this.loggerCronjob = this.loggerService.getCronjobLogger(ClassName.name)
 * }
 * ```
 */
@Injectable()
export class LoggerService implements INestLoggerService {
  constructor(private readonly loggerConfig: LoggerConfig) {}

  /**
   * Get general logger instance (default logger)
   * @param context Optional context name (usually class name)
   * @returns Winston logger instance
   */
  getLogger(context?: string): winston.Logger {
    const config = this.loggerConfig.getConfig()
    return createLogger({
      type: LoggerType.GENERAL,
      config,
      context,
    })
  }

  /**
   * Get cronjob logger instance
   * @param context Optional context name (usually class name)
   * @returns Winston logger instance configured for cronjob logging
   */
  getCronjobLogger(context?: string): winston.Logger {
    const config = this.loggerConfig.getConfig()
    return createLogger({
      type: LoggerType.CRONJOB,
      config,
      context,
    })
  }

  /**
   * Get director logger instance
   * @param context Optional context name (usually class name)
   * @returns Winston logger instance configured for director logging
   */
  getDirectorLogger(context?: string): winston.Logger {
    const config = this.loggerConfig.getConfig()
    return createLogger({
      type: LoggerType.DIRECTOR,
      config,
      context,
    })
  }

  // NestJS LoggerService interface implementation for compatibility
  log(message: any, context?: string): void {
    const logger = this.getLogger(context)
    logger.info(message)
  }

  error(message: any, trace?: string, context?: string): void {
    const logger = this.getLogger(context)
    logger.error(message, { trace, stack: trace })
  }

  warn(message: any, context?: string): void {
    const logger = this.getLogger(context)
    logger.warn(message)
  }

  debug(message: any, context?: string): void {
    const logger = this.getLogger(context)
    logger.debug(message)
  }

  verbose(message: any, context?: string): void {
    const logger = this.getLogger(context)
    logger.verbose(message)
  }
}
