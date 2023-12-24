import { ValueObject } from "#ddd/primitives/value-object"
import { Result } from "#ddd/result"
import * as Joi from "joi"
import { InvalidMediaType } from "#mediaCatalog/domain/errors/mediaType.value-object"

interface IMediaTypeValueObject {
  value: string
}

export type IAllowedMediaTypes = 'tvshow' | 'movie'

export class MediaTypeValueObject extends ValueObject<IMediaTypeValueObject> {
  static maxCharCount = 50
  static allowedTypes: IAllowedMediaTypes[] = ['tvshow', 'movie']

  private constructor(props: IMediaTypeValueObject) {
    super(props)
  }

  private static validate(mediaType: IAllowedMediaTypes) {
    const schema = Joi.string()
      .valid(...this.allowedTypes)
      .max(this.maxCharCount)
      .pattern(/^((?![*?<>:"/\\|]).)*$/)
      .messages({
        'string.empty': `${mediaType} cannot be an empty field`,
        'string.max': `${mediaType} should have a maximum length of {#limit}`,
        'any.only': `${mediaType} is not an allowed type`,
        'string.pattern.base': `${mediaType} has invalid characters`
      })
      .label('FileName')

    return schema.validate(mediaType, { abortEarly: false })
  }

  public static create(mediaType: IAllowedMediaTypes): Result<MediaTypeValueObject> {
    const titleOrError = this.validate(mediaType)
    if (titleOrError.error){
      return Result.fail(new InvalidMediaType(titleOrError.error.message))
    }

    return Result.ok(new MediaTypeValueObject({value: mediaType}))
  }
}