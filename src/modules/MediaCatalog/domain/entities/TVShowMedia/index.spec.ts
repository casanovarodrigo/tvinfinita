import { unsafelyUnfurlEither } from '#test/shared'
import { TVShowMedia } from '.'

describe('TVShowMedia', () => {
  const singleSubMediaInfo = {
    fileName: 'S01E02',
    filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja/Temporada 1/',
    fileExt: '.avi',
    name: 'Episódio 4',
    folderName: '1',
    duration: 2000,
    width: 860,
    height: 480,
    ratio: '4:3',
  }

  const singleSubMediaInfoWithId = {
    id: '5f40ced7-7aaf-441f-8f00-5d215502bc4f',
    fileName: 'S01E02',
    filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja/Temporada 1/',
    fileExt: '.avi',
    folderName: '1',
    duration: 2000,
    width: 860,
    height: 480,
    ratio: '4:3',
  }

  // beforeAll(() => {
  // })

  it('should return one single media entity with mediaName', () => {
    const infoToUse = {
      ...singleSubMediaInfoWithId,
      title: 'Test name',
    }
    const SubMediaOrError = TVShowMedia.create(infoToUse)
    const SingleSubMediaInstanceWithName = SubMediaOrError.result
    expect(SingleSubMediaInstanceWithName.DTO).toEqual(infoToUse)
  })

  it('should return one single media entity with newly created id string', () => {
    const infoToUse = {
      ...singleSubMediaInfo,
      title: 'Test name',
    }
    const SubMediaOrError = TVShowMedia.create(infoToUse)
    const SingleSubMediaInstanceWithName = SubMediaOrError.result
    expect(SingleSubMediaInstanceWithName.DTO).not.toEqual(infoToUse)
  })
})
