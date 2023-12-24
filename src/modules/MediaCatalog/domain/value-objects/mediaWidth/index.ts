import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidMediaWidth } from "../../errors/mediaWidth.value-object"

interface IMediaWidthValueObject {
  value: number
}

export class MediaWidthValueObject extends ValueObject<IMediaWidthValueObject> {
  static minValue = 100
  static maxValue = 10000

  private constructor(props: IMediaWidthValueObject) {
    super(props)
  }

  private static validate(mediaWidth: number) {
    const schema = Joi.number()
      .min(this.minValue)
      .max(this.maxValue)
      .messages({
        'number.base': `${mediaWidth} should be a number`,
        'number.empty': `${mediaWidth} cannot be an empty field`,
        'number.min': `Media width ${mediaWidth} must be greater than or equal to {#limit}`,
        'number.max': `Media width ${mediaWidth} must be less than or equal to {#limit}`,
      })
      .label('MediaWidth')

    return schema.validate(mediaWidth, { abortEarly: false })
  }

  public static create(mediaWidth: number): Result<MediaWidthValueObject> {
    const titleOrError = this.validate(mediaWidth)
    if (titleOrError.error){
      return Result.fail(new InvalidMediaWidth(titleOrError.error.message))
    }

    return Result.ok(new MediaWidthValueObject({value: mediaWidth}))
  }
}