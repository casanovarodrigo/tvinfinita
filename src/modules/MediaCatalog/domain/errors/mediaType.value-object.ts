import { BaseError } from '#ddd/primitives/base-error'

export class InvalidMediaType extends BaseError {
  constructor(message: string) {
    super(message, 'InvalidMediaType')
  }
}
