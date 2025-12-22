import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { LoggerService } from '../infra/logging/services/logger.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const server = await app.listen(3000)

  if (process.env.NODE_ENV === 'development') {
    const loggerService = app.get(LoggerService)
    const logger = loggerService.getLogger('Bootstrap')
    const address = server.address()
    const port = typeof address === 'string' ? address : address?.port || 3000
    logger.info(`Application is running on port ${port}`)
  }
}
bootstrap()
