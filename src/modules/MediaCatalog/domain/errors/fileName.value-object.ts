import { BaseError } from '#ddd/primitives/base-error'

export class InvalidFileName extends BaseError {
  constructor(message: string) {
    super(message, 'InvalidFileName')
  }
}
