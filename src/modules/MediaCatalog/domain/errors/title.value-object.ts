import { BaseError } from '#ddd/primitives/base-error'

export class InvalidTitle extends BaseError {
  constructor(message: string) {
    super(message, 'InvalidTitle')
  }
}
