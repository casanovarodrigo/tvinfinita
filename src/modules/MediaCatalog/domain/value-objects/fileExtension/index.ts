import { BaseError } from "#ddd/primitives/base-error"
import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidFileExtension } from "../../errors/fileExtension.value-object"

interface IFileExtensionValueObject {
  value: string
}

export class FileExtensionValueObject extends ValueObject<IFileExtensionValueObject> {
  static minCharCount = 2
  static maxCharCount = 50
  static allowedFormats = [
    'avi',
    'mkv'
  ]

  private constructor(props: IFileExtensionValueObject) {
    super(props)
  }

  private static validate(fileExt: string) {
    const schema = Joi.string()
      .min(this.minCharCount)
      .max(this.maxCharCount)
      .valid(...this.allowedFormats)
      .messages({
        'string.empty': `${fileExt} cannot be an empty field`,
        'string.min': `${fileExt} should have a minimum length of {#limit}`,
        'string.max': `${fileExt} should have a maximum length of {#limit}`,
        'any.only': `${fileExt} extension is invalid. Must be one of: ${this.allowedFormats.join(', ')}`,
      })
      .label('FileExtension')

    return schema.validate(fileExt, { abortEarly: false })
  }

  public static create(fileExt: string): Result<FileExtensionValueObject> {
    const titleOrError = this.validate(fileExt)
    if (titleOrError.error){
      return Result.fail(new InvalidFileExtension(titleOrError.error.message))
    }

    return Result.ok(new FileExtensionValueObject({value: fileExt}))
  }
}