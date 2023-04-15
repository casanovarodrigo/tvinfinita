import { Either, left, right } from "#ddd/either"
import { BaseError } from "#ddd/primitives/base-error"
import { ValueObject } from "#ddd/primitives/value-object"
import * as Joi from "joi"

interface ITitleValueObject {
  value: string
}

export const titleMinCharCount = 3
export const titleMaxCharCount = 50

export class TitleValueObject extends ValueObject<ITitleValueObject> {
  private constructor(props: ITitleValueObject) {
    super(props)
  }

  private static validate(title: string) {
    const schema = Joi.string()
      .min(titleMinCharCount)
      .max(titleMaxCharCount)
      .messages({
        'string.empty': `${title} cannot be an empty field`,
        'string.min': `${title} should have a minimum length of {#limit}`,
        'string.max': `${title} should have a maximum length of {#limit}`,
      })
      .label('Title')

    return schema.validate(title, { abortEarly: false })
  }

  public static create(title: string): Either<BaseError, TitleValueObject> {
    const titleOrError = this.validate(title)
    if (titleOrError.error){
      return left(new BaseError('TitleValueObject test error'))
    }

    return right(new TitleValueObject({value: title}))
  }
}