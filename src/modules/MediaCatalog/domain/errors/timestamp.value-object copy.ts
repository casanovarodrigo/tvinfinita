import { BaseError } from "#ddd/primitives/base-error";

export class InvalidTimestamp extends BaseError {
  constructor(message: string){
    super(
      message,
      'InvalidTimestamp'
    )
  }
}