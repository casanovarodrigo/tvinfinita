import { FileNameValueObject } from "."

describe('FileNameValueObject', () => {

  it('should return a valid title value object', () => {
		const title = 'Bob Esponja'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.result.value).toEqual(title)
	})


	it('should return a invalid title value object - invalid char *', () => {
		const title = 'Bob Esponj*a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})

	it('should return a invalid title value object - invalid char <', () => {
		const title = 'Bob Esponj<a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})

	it('should return a invalid title value object - invalid char >', () => {
		const title = 'Bob Esponj>a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})

	it('should return a invalid title value object - invalid char :', () => {
		const title = 'Bob Esponj:a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})

	it('should return a invalid title value object - invalid char "', () => {
		const title = 'Bob Esponj"a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})

	it('should return a invalid title value object - invalid char /', () => {
		const title = 'Bob Esponj/a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})

	it('should return a invalid title value object - invalid char \\', () => {
		const title = 'Bob Esponj\\a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})

	it('should return a invalid title value object - invalid char |', () => {
		const title = 'Bob Esponj|a'
		const fileNameOrError = FileNameValueObject.create(title)
		expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
	})
})