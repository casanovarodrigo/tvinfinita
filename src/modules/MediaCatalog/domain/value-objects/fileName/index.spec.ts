import { FileNameValueObject } from "."

describe('FileNameValueObject', () => {

  it('should return a valid title value object', () => {
		const title = 'Bob Esponja'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.result.value).toEqual(title)
	})

})