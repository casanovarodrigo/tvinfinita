import { TitleValueObject } from "."
import { InvalidTitle } from "../../errors/title.value-object"

describe('TitleValueObject', () => {
  it('should return a valid title value object', () => {
		const titleOrError = TitleValueObject.create('Bob Esponja')
		if (titleOrError.isSuccess)
   		expect(titleOrError.result.value).toEqual('Bob Esponja')
	})
	
	it('min length error - empty - should return an invalid title error', () => {
		const invalidValue = ''
		const titleOrError = TitleValueObject.create(invalidValue)
		expect(titleOrError.error).toBeInstanceOf(InvalidTitle)
		expect(titleOrError.error.message).toEqual(`The string ${invalidValue} cannot be an empty field`)
	})

	it('min length error - less than ideal - should return an invalid title error', () => {
		const invalidValue = 'AB'
		const titleOrError = TitleValueObject.create(invalidValue)
		expect(titleOrError.error).toBeInstanceOf(InvalidTitle)
		expect(titleOrError.error.message).toEqual(`The string ${invalidValue} should have a minimum length of ${TitleValueObject.minCharCount}`)
	})

	it('max length - error should return an invalid title error', () => {
		let invalidValue: string = ''
		for (let index = 0; index <= 150; index++) {
			invalidValue += 'a';
		}
		const titleOrError = TitleValueObject.create(invalidValue)
		expect(titleOrError.error).toBeInstanceOf(InvalidTitle)
		expect(titleOrError.error.message).toEqual(`The string ${invalidValue} should have a maximum length of ${TitleValueObject.maxCharCount}`)
	})
})