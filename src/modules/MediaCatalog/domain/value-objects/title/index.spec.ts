import { TitleValueObject } from "."
import { InvalidTitle } from "../../errors/title.value-object"

describe('TitleValueObject', () => {
  it('should return a valid title value object', () => {
		const titleOrError = TitleValueObject.create('Bob Esponja')
		if (titleOrError.isSuccess)
   		expect(titleOrError.result.value).toEqual('Bob Esponja')
	})
	
	it('min length error - should return an invalid title error', () => {
		const invalidValue = 'B'
		const titleOrError = TitleValueObject.create(invalidValue)
		expect(titleOrError.error).toBeInstanceOf(InvalidTitle)
		expect(titleOrError.error.message).toEqual(`The string ${invalidValue} should have a minimum length of ${TitleValueObject.minCharCount}`)
	})	

	it('max length - error should return an invalid title error', () => {
		let invalidValue: string = ''
		for (let index = 0; index <= 50; index++) {
			invalidValue += 'a';
		}
		const titleOrError = TitleValueObject.create(invalidValue)
		expect(titleOrError.error).toBeInstanceOf(InvalidTitle)
		expect(titleOrError.error.message).toEqual(`The string ${invalidValue} should have a maximum length of ${TitleValueObject.maxCharCount}`)
	})
})