import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidFileName } from "#mediaCatalog/domain/errors/fileName.value-object"

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
      .pattern(/^((?![*?<>:"/\\|]).)*$/)
      .messages({
        'string.empty': `${fileName} cannot be an empty field`,
        'string.min': `${fileName} should have a minimum length of {#limit}`,
        'string.max': `${fileName} should have a maximum length of {#limit}`,
        'string.pattern.base': `${fileName} has invalid characters`
      })
      .label('FileName')

    return schema.validate(fileName, { abortEarly: false })
  }

  public static create(fileName: string): Result<FileNameValueObject> {
    const titleOrError = this.validate(fileName)
    if (titleOrError.error){
      return Result.fail(new InvalidFileName(titleOrError.error.message))
    }

    return Result.ok(new FileNameValueObject({value: fileName}))
  }
}