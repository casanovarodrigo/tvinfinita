import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidMediaDuration } from "#mediaCatalog/domain/errors/mediaDurationvalue-object"

interface IMediaDurationValueObject {
  value: number
}

export class MediaDurationValueObject extends ValueObject<IMediaDurationValueObject> {
  static minValue = 3

  private constructor(props: IMediaDurationValueObject) {
    super(props)
  }

  private static validate(mediaDuration: number) {
    const schema = Joi.number()
      .min(this.minValue)
      .messages({
        'number.base': `${mediaDuration} should be a number`,
        'number.empty': `${mediaDuration} cannot be an empty field`,
        'number.min': `Media duration ${mediaDuration} must be greater than or equal to {#limit}`,
      })
      .label('MediaDuration')

    return schema.validate(mediaDuration, { abortEarly: false })
  }

  public static create(mediaDuration: number): Result<MediaDurationValueObject> {
    const titleOrError = this.validate(mediaDuration)
    if (titleOrError.error){
      return Result.fail(new InvalidMediaDuration(titleOrError.error.message))
    }

    return Result.ok(new MediaDurationValueObject({value: mediaDuration}))
  }
}