import { BaseError } from "#ddd/primitives/base-error";

export class InvalidMediaDuration extends BaseError {
  constructor(message: string){
    super(
      message,
      'InvalidMediaDuration'
    )
  }
}