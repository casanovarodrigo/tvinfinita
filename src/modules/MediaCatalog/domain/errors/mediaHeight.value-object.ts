import { BaseError } from "#ddd/primitives/base-error";

export class InvalidMediaHeight extends BaseError {
  constructor(message: string){
    super(
      message,
      'InvalidMediaHeight'
    )
  }
}