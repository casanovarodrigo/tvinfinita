import { MediaWidthValueObject } from '.'
import { InvalidMediaWidth } from '#mediaCatalog/domain/errors/mediaWidth.value-object'

describe('MediaWidthValueObject', () => {
  it('should return an invalid media width value object lower than minimum', () => {
    const width = 0
    const mediaWidthOrError = MediaWidthValueObject.create(width)
    expect(mediaWidthOrError.error).toBeInstanceOf(InvalidMediaWidth)
    expect(mediaWidthOrError.error.message).toEqual(
      `Media width ${width} must be greater than or equal to ${MediaWidthValueObject.minValue}`
    )
  })

  it('should return an invalid media width height value object higher than maximum', () => {
    const width = 100000
    const mediaWidthOrError = MediaWidthValueObject.create(width)
    expect(mediaWidthOrError.error).toBeInstanceOf(InvalidMediaWidth)
    expect(mediaWidthOrError.error.message).toEqual(
      `Media width ${width} must be less than or equal to ${MediaWidthValueObject.maxValue}`
    )
  })

  it('should return an invalid media width value object not a number', () => {
    const width = 'asd' as unknown as number
    const mediaWidthOrError = MediaWidthValueObject.create(width)
    expect(mediaWidthOrError.error).toBeInstanceOf(InvalidMediaWidth)
    expect(mediaWidthOrError.error.message).toEqual(`${width} should be a number`)
  })

  it('should return an invalid media width value object not a number, empty string', () => {
    const width = '' as unknown as number
    const mediaWidthOrError = MediaWidthValueObject.create(width)
    expect(mediaWidthOrError.error).toBeInstanceOf(InvalidMediaWidth)
    expect(mediaWidthOrError.error.message).toEqual(`${width} should be a number`)
  })

  it('should return a valid media width value object', () => {
    const width = 200
    const mediaWidthOrError = MediaWidthValueObject.create(width)
    expect(mediaWidthOrError.result.value).toEqual(width)
  })
})
