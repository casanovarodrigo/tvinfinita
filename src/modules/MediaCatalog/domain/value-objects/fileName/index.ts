import { BaseError } from "#ddd/primitives/base-error"
import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"

interface IFileNameValueObject {
  value: string
}


export class FileNameValueObject extends ValueObject<IFileNameValueObject> {
  static minCharCount = 1
  static maxCharCount = 50

  private constructor(props: IFileNameValueObject) {
    super(props)
  }

  private static validate(fileName: string) {
    const schema = Joi.string()
      .min(this.minCharCount)
      .max(this.maxCharCount)
      .messages({
        'string.empty': `${fileName} cannot be an empty field`,
        'string.min': `${fileName} should have a minimum length of {#limit}`,
        'string.max': `${fileName} should have a maximum length of {#limit}`,
      })
      .label('FileName')

    return schema.validate(fileName, { abortEarly: false })
  }

  public static create(fileName: string): Result<FileNameValueObject> {
    const titleOrError = this.validate(fileName)
    if (titleOrError.error){
      return Result.fail(new BaseError('FileNameValueObject test error'))
    }

    return Result.ok(new FileNameValueObject({value: fileName}))
  }
}