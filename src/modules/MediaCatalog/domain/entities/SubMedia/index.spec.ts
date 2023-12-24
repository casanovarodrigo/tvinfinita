import { unsafelyUnfurlEither } from "#test/shared"
import { SubMedia } from "."

describe('SubMedia', () => {

	const singleSubMediaInfo = {
		fileName: 'S01E02',
		filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja/Temporada 1/',
		fileExtension: '.avi'
	}

	const singleSubMediaInfoWithId = {
		id: '5f40ced7-7aaf-441f-8f00-5d215502bc4f',
		fileName: 'S01E02',
		filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja/Temporada 1/',
		fileExtension: '.avi'
	}

	// beforeAll(() => {
	// })

  it('should return one single media entity without mediaName', () => {
		const SubMediaOrError = SubMedia.create(singleSubMediaInfoWithId)
		const SingleSubMediaInstance = SubMediaOrError.result
    expect(SingleSubMediaInstance.DTO).toEqual(singleSubMediaInfoWithId)
	})

  it('should return one single media entity with mediaName', () => {
		const infoToUse = {
			...singleSubMediaInfoWithId,
			mediaName: 'Test name'
		}
		const SubMediaOrError = SubMedia.create(infoToUse)
		const SingleSubMediaInstanceWithName = SubMediaOrError.result
    expect(SingleSubMediaInstanceWithName.DTO).toEqual(infoToUse)
	})

  it('should return one single media entity with newly created id string', () => {
		const infoToUse = {
			...singleSubMediaInfo,
			mediaName: 'Test name'
		}
		const SubMediaOrError = SubMedia.create(infoToUse)
		const SingleSubMediaInstanceWithName = SubMediaOrError.result
    expect(SingleSubMediaInstanceWithName.DTO).not.toEqual(infoToUse)
	})

})