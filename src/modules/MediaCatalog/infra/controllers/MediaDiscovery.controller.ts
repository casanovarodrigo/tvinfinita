import { Controller, Get } from '@nestjs/common'
// import { AppService } from './app.service'

@Controller()
export class MediaDiscoveryController {
  // constructor(private readonly appService: AppService) {}
  constructor() {}

  // api/v1/all-unvalidated-titles
  @Get('/all-unvalidated-titles')
  getHello(): string {
    return 'this.appService.getHello()'
  }
}
