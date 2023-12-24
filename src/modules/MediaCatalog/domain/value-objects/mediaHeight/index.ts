import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidMediaHeight } from "#mediaCatalog/domain/errors/mediaHeight.value-object"

interface IMediaHeightValueObject {
  value: number
}

export class MediaHeightValueObject extends ValueObject<IMediaHeightValueObject> {
  static minValue = 100
  static maxValue = 10000

  private constructor(props: IMediaHeightValueObject) {
    super(props)
  }

  private static validate(mediaHeight: number) {
    const schema = Joi.number()
      .min(this.minValue)
      .max(this.maxValue)
      .messages({
        'number.base': `${mediaHeight} should be a number`,
        'number.empty': `${mediaHeight} cannot be an empty field`,
        'number.min': `Media height ${mediaHeight} must be greater than or equal to {#limit}`,
        'number.max': `Media height ${mediaHeight} must be less than or equal to {#limit}`,
      })
      .label('MediaHeight')

    return schema.validate(mediaHeight, { abortEarly: false })
  }

  public static create(mediaHeight: number): Result<MediaHeightValueObject> {
    const titleOrError = this.validate(mediaHeight)
    if (titleOrError.error){
      return Result.fail(new InvalidMediaHeight(titleOrError.error.message))
    }

    return Result.ok(new MediaHeightValueObject({value: mediaHeight}))
  }
}