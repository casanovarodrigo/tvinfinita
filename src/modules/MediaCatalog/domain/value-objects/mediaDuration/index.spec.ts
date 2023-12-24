import { MediaDurationValueObject } from "."
import { InvalidMediaDuration } from "#mediaCatalog/domain/errors/mediaDurationvalue-object"

describe('MediaDurationValueObject', () => {

	it('should return an invalid media width value object lower than minimum', () => {
		const duration = 0
		const mediaWidthOrError = MediaDurationValueObject.create(duration)
		expect(mediaWidthOrError.error).toBeInstanceOf(InvalidMediaDuration)
		expect(mediaWidthOrError.error.message).toEqual(`Media duration ${duration} must be greater than or equal to ${MediaDurationValueObject.minValue}`)
	})

	it('should return an invalid media width value object not a number', () => {
		const duration = 'asd' as unknown as number
		const mediaWidthOrError = MediaDurationValueObject.create(duration)
		expect(mediaWidthOrError.error).toBeInstanceOf(InvalidMediaDuration)
		expect(mediaWidthOrError.error.message).toEqual(`${duration} should be a number`)
	})

	it('should return an invalid media width value object not a number, empty string', () => {
		const duration = '' as unknown as number
		const mediaWidthOrError = MediaDurationValueObject.create(duration)
		expect(mediaWidthOrError.error).toBeInstanceOf(InvalidMediaDuration)
		expect(mediaWidthOrError.error.message).toEqual(`${duration} should be a number`)
	})

	it('should return a valid media width value object', () => {
		const duration = 200
		const mediaWidthOrError = MediaDurationValueObject.create(duration)
		expect(mediaWidthOrError.result.value).toEqual(duration)
	})

})