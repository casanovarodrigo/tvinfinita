import { Either, left, right } from "#ddd/either"
import { BaseError } from "#ddd/primitives/base-error"
import { ValueObject } from "#ddd/primitives/value-object"
import * as Joi from "joi"

interface IFileNameValueObject {
  value: string
}

export const titleMinCharCount = 1
export const titleMaxCharCount = 50

export class FileNameValueObject extends ValueObject<IFileNameValueObject> {
  private constructor(props: IFileNameValueObject) {
    super(props)
  }

  private static validate(fileName: string) {
    const schema = Joi.string()
      .min(titleMinCharCount)
      .max(titleMaxCharCount)
      .messages({
        'string.empty': `${fileName} cannot be an empty field`,
        'string.min': `${fileName} should have a minimum length of {#limit}`,
        'string.max': `${fileName} should have a maximum length of {#limit}`,
      })
      .label('Title')

    return schema.validate(fileName, { abortEarly: false })
  }

  public static create(fileName: string): Either<BaseError, FileNameValueObject> {
    const titleOrError = this.validate(fileName)
    if (titleOrError.error){
      return left(new BaseError('FileNameValueObject test error'))
    }

    return right(new FileNameValueObject({value: fileName}))
  }
}