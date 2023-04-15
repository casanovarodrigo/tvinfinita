import { TitleValueObject } from "."

describe('TitleValueObject', () => {

	// beforeAll(() => {
	// 	MediaTitleMock = MediaTitle
	// })

  it('should return a valid title value object', () => {
		const titleOrError: TitleValueObject | Error = TitleValueObject.create('Bob Esponja')
		if (titleOrError && titleOrError.value)
   	 expect(titleOrError.value).toEqual('Bob Esponja')
	})

  // it('should create storage/validated folders', () => {
	// 	const validatedFolderExists = fs.existsSync(MediaTitle.validatedFolderPath)
  //   expect(validatedFolderExists).toBeTruthy()
	// })

})