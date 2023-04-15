import { TitleValueObject } from "."

describe('TitleValueObject', () => {

	// beforeAll(() => {
	// 	MediaTitleMock = MediaTitle
	// })

  it('should return a valid title value object', () => {
		const titleOrError = TitleValueObject.create('Bob Esponja')
		if (titleOrError.isSuccess)
   		expect(titleOrError.result.value).toEqual('Bob Esponja')
	})
	
	it('should return a valid title value object', () => {
		const titleOrError = TitleValueObject.create('Bob Esponja')
		expect(titleOrError.result.value).toEqual('Bob Esponja')
	})

  // it('should create storage/validated folders', () => {
	// 	const validatedFolderExists = fs.existsSync(MediaTitle.validatedFolderPath)
  //   expect(validatedFolderExists).toBeTruthy()
	// })

})