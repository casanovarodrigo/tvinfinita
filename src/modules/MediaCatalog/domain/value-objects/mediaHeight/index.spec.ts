import { MediaHeightValueObject } from '.'
import { InvalidMediaHeight } from '#mediaCatalog/domain/errors/mediaHeight.value-object'

describe('MediaHeightValueObject', () => {
  it('should return an invalid media height value object lower than minimum', () => {
    const height = 0
    const mediaHeightOrError = MediaHeightValueObject.create(height)
    expect(mediaHeightOrError.error).toBeInstanceOf(InvalidMediaHeight)
    expect(mediaHeightOrError.error.message).toEqual(
      `Media height ${height} must be greater than or equal to ${MediaHeightValueObject.minValue}`
    )
  })

  it('should return an invalid media height value object higher than maximum', () => {
    const height = 100000
    const mediaHeightOrError = MediaHeightValueObject.create(height)
    expect(mediaHeightOrError.error).toBeInstanceOf(InvalidMediaHeight)
    expect(mediaHeightOrError.error.message).toEqual(
      `Media height ${height} must be less than or equal to ${MediaHeightValueObject.maxValue}`
    )
  })

  it('should return an invalid media value object not a number', () => {
    const height = 'asd' as unknown as number
    const mediaHeightOrError = MediaHeightValueObject.create(height)
    expect(mediaHeightOrError.error).toBeInstanceOf(InvalidMediaHeight)
    expect(mediaHeightOrError.error.message).toEqual(`${height} should be a number`)
  })

  it('should return an invalid media value object not a number, empty string', () => {
    const height = '' as unknown as number
    const mediaHeightOrError = MediaHeightValueObject.create(height)
    expect(mediaHeightOrError.error).toBeInstanceOf(InvalidMediaHeight)
    expect(mediaHeightOrError.error.message).toEqual(`${height} should be a number`)
  })

  it('should return a valid media value object', () => {
    const height = 200
    const mediaHeightOrError = MediaHeightValueObject.create(height)
    expect(mediaHeightOrError.result.value).toEqual(height)
  })
})
