import { Result } from "#ddd/result"
import { FileNameValueObject } from "."

describe('fileNameValueObject', () => {
	// beforeAll(() => {
	// 	MediaTitleMock = MediaTitle
	// })

  it('should return a valid title value object', () => {
		const fileNameOrError: Result<FileNameValueObject> = FileNameValueObject.create('Bob Esponja')
		expect(fileNameOrError.result.value).toEqual('Bob Esponja')
	})

})