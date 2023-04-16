import { Result } from "#ddd/result"
import { FileExtensionValueObject } from "."

describe('FileExtensionValueObject', () => {

  it('should return a valid file extension value object', () => {
		const ext = 'avi'
		const fileExtensionOrError: Result<FileExtensionValueObject> = FileExtensionValueObject.create(ext)
		expect(fileExtensionOrError.result.value).toEqual(ext)
	})

  it('not allowed format - should return an invalid file extension error', () => {
		const ext = 'exe'
		const firstError = `${ext} extension is invalid. Must be one of the following: ${FileExtensionValueObject.allowedFormats.join(', ')}`
		const fileExtensionOrError: Result<FileExtensionValueObject> = FileExtensionValueObject.create(ext)
		expect(fileExtensionOrError.error.message).toEqual(firstError)
	})

  it('min length - should return an invalid file extension error', () => {
		const ext = 'e'
		const firstError = `${ext} extension is invalid. Must be one of the following: ${FileExtensionValueObject.allowedFormats.join(', ')}`
		const secondError = `${ext} should have a minimum length of ${FileExtensionValueObject.minCharCount}`
		const fileExtensionOrError: Result<FileExtensionValueObject> = FileExtensionValueObject.create(ext)
		expect(fileExtensionOrError.error.message).toEqual([firstError, secondError].join('. '))
	})

})