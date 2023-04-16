import { unsafelyUnfurlEither } from "#test/shared"
import { SubMedia } from "."

describe('MediaTitle', () => {

	const singleSubMediaInfo = {
		fileName: 'S01E02',
		filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja/Temporada 1/',
		fileExtension: '.avi'
	}

	// beforeAll(() => {
	// })

  it('should return one single media entity without mediaName', () => {
		const SubMediaOrError = SubMedia.create(singleSubMediaInfo)
		const SingleSubMediaInstance = SubMediaOrError.result
    expect(SingleSubMediaInstance.DTO).toEqual(singleSubMediaInfo)
	})

  it('should return one single media entity without mediaName', () => {
		const infoToUse = {
			...singleSubMediaInfo,
			mediaName: 'Test name'
		}
		const SubMediaOrError = SubMedia.create(infoToUse)
		const SingleSubMediaInstanceWithName = SubMediaOrError.result
    expect(SingleSubMediaInstanceWithName.DTO).toEqual(infoToUse)
	})

})