import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LoggerService } from './services/logger.service'
import { LoggerConfig } from './config/logger.config'

/**
 * LoggingModule provides Winston-based logging infrastructure
 * - General logger (default)
 * - Cronjob logger (for cronjob operations)
 * - Director logger (for director/scene operations)
 *
 * This module is marked as @Global() so it can be used throughout the application
 * without importing it in every module.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [LoggerConfig, LoggerService],
  exports: [LoggerService],
})
export class LoggingModule {}
