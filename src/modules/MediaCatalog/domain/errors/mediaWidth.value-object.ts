import { BaseError } from "#ddd/primitives/base-error";

export class InvalidMediaWidth extends BaseError {
  constructor(message: string){
    super(
      message,
      'InvalidMediaWidth'
    )
  }
}