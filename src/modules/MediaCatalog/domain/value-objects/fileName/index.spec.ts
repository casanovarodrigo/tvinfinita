import { Result } from "#ddd/result"
import { FileNameValueObject } from "."

describe('FileNameValueObject', () => {

  it('should return a valid title value object', () => {
		const title = 'Bob Esponja'
		const fileNameOrError: Result<FileNameValueObject> = FileNameValueObject.create(title)
		expect(fileNameOrError.result.value).toEqual(title)
	})

})