import { IAllowedMediaTypes, MediaTypeValueObject } from "."
import { InvalidMediaType } from "#mediaCatalog/domain/errors/mediaType.value-object"

describe('MediaTypeValueObject', () => {

	it('should return an invalid media type value object', () => {
		const type = 'invalidtype' as IAllowedMediaTypes
		const mediaTypeOrError = MediaTypeValueObject.create(type)
		expect(mediaTypeOrError.error).toBeInstanceOf(InvalidMediaType)
		expect(mediaTypeOrError.error.message).toEqual(`${type} is not an allowed type`)
	})

  it('should return a valid media type tvshow value object', () => {
		const type = 'tvshow'
		const mediaTypeOrError = MediaTypeValueObject.create(type)
		expect(mediaTypeOrError.result.value).toEqual(type)
	})

  it('should return a valid media type movie value object', () => {
		const type = 'movie'
		const mediaTypeOrError = MediaTypeValueObject.create(type)
		expect(mediaTypeOrError.result.value).toEqual(type)
	})


})