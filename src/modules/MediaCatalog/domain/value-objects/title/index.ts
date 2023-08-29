import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidTitle } from "#mediaCatalog/domain/errors/title.value-object"

interface ITitleValueObject {
  value: string
}

export class TitleValueObject extends ValueObject<ITitleValueObject> {
  static minCharCount: number = 3
  static maxCharCount: number = 150

  private constructor(props: ITitleValueObject) {
    super(props)
  }

  private static validate(title: string) {
    const schema = Joi.string()
      .min(this.minCharCount)
      .max(this.maxCharCount)
      .messages({
        'string.empty': `The string ${title} cannot be an empty field`,
        'string.min': `The string ${title} should have a minimum length of {#limit}`,
        'string.max': `The string ${title} should have a maximum length of {#limit}`,
      })
      .label('Title')

    return schema.validate(title, { abortEarly: false })
  }

  public static create(title: string): Result<TitleValueObject> {
    const titleOrError = this.validate(title)
    if (titleOrError.error){
      return Result.fail(new InvalidTitle(titleOrError.error.message))
    }

    return Result.ok(new TitleValueObject({value: title}))
  }
}