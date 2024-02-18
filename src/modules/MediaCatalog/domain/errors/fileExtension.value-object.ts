import { BaseError } from '#ddd/primitives/base-error'

export class InvalidFileExtension extends BaseError {
  constructor(message: string) {
    super(message, 'InvalidFileExtension')
  }
}
