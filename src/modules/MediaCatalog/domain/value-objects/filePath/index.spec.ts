import { FilePathValueObject } from '.'
import { InvalidFileName } from '#mediaCatalog/domain/errors/fileName.value-object'

describe('FilePathValueObject', () => {
  it('should return a valid title value object', () => {
    const title = 'E:/Stream/TvInfinita/Repository/Bob Esponja'
    const fileNameOrError = FilePathValueObject.create(title)
    expect(fileNameOrError.result.value).toEqual(title)
  })

  it('should return a invalid title value object - invalid char *', () => {
    const title = 'E:/Stream/TvInfinita/Repository/Bob E*sponja'
    const fileNameOrError = FilePathValueObject.create(title)
    expect(fileNameOrError.error).toBeInstanceOf(InvalidFileName)
    expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
  })

  it('should return a invalid title value object - invalid char <', () => {
    const title = 'E:/Stream/TvInfinita/Repository/Bob Esponj<a'
    const fileNameOrError = FilePathValueObject.create(title)
    expect(fileNameOrError.error).toBeInstanceOf(InvalidFileName)
    expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
  })

  it('should return a invalid title value object - invalid char >', () => {
    const title = 'E:/Stream/TvInfinita/Repository/Bob Esponj>a'
    const fileNameOrError = FilePathValueObject.create(title)
    expect(fileNameOrError.error).toBeInstanceOf(InvalidFileName)
    expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
  })

  it('should return a invalid title value object - invalid char "', () => {
    const title = 'E:/Stream/TvInfinita/Repository/Bob Esponj"a'
    const fileNameOrError = FilePathValueObject.create(title)
    expect(fileNameOrError.error).toBeInstanceOf(InvalidFileName)
    expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
  })

  // it('should return a invalid title value object - invalid char /', () => {
  // 	const title = 'Bob Esponj/a'
  // 	const fileNameOrError = FilePathValueObject.create(title)
  // 	expect(fileNameOrError.error).toBeInstanceOf(InvalidFileName)
  // 	expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
  // })

  // it('should return a invalid title value object - invalid char \\', () => {
  // 	const title = 'Bob Esponj\\a'
  // 	const fileNameOrError = FilePathValueObject.create(title)
  // 	expect(fileNameOrError.error).toBeInstanceOf(InvalidFileName)
  // 	expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
  // })

  it('should return a invalid title value object - invalid char |', () => {
    const title = 'E:/Stream/TvInfinita/Repository/Bob Esponj|a'
    const fileNameOrError = FilePathValueObject.create(title)
    expect(fileNameOrError.error).toBeInstanceOf(InvalidFileName)
    expect(fileNameOrError.error.message).toEqual(`${title} has invalid characters`)
  })
})
