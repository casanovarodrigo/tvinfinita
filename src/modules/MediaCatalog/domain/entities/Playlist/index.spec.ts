import { ITVShowMediaDTO } from '../TVShowMedia/interfaces'
import { ICollection } from './interfaces'
import { Playlist } from '.'

describe('Playlist', () => {
  it('should create a Playlist from a unidimensional folder', () => {
    const mediaList: ITVShowMediaDTO[] = [
      {
        fileName: 'S01E01.avi',
        title: 'Episódio 1',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E02.avi',
        title: 'Episódio 2',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E03.avi',
        title: 'Episódio 3',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E04.avi',
        title: 'Episódio 4',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E05.avi',
        title: 'Episódio 5',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
    ]

    const PlaylistInstance = Playlist.create({
      title: 'Bob Esponja',
      submedia: mediaList,
      isAnchor: true,
      mediaTitleId: '232as',
    })

    const subMediasAsArray = PlaylistInstance.getSubmediaMapAsArray()
    const collectionsAsArray = PlaylistInstance.getCollectionMapAsArray()
    expect(subMediasAsArray).toEqual(mediaList)
    expect(collectionsAsArray).toEqual(undefined)
  })

  it('should create a Playlist from a bidimensional folder', () => {
    const seasonOneFolderAndMediaList: ITVShowMediaDTO[] = [
      {
        fileName: 'S01E01.avi',
        title: 'Episódio 1',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E02.avi',
        title: 'Episódio 2',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E03.avi',
        title: 'Episódio 3',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E04.avi',
        title: 'Episódio 4',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S01E05.avi',
        title: 'Episódio 5',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
    ]
    const seasonTwoFolderAndMediaList: ITVShowMediaDTO[] = [
      {
        fileName: 'S02E01.avi',
        title: 'Episódio 1',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S02E02.avi',
        title: 'Episódio 2',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S02E03.avi',
        title: 'Episódio 3',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S02E04.avi',
        title: 'Episódio 4',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
      {
        fileName: 'S02E05.avi',
        title: 'Episódio 5',
        fileExt: 'avi',
        filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja',
        folderName: '1',
        duration: 2000,
        width: 860,
        height: 480,
        ratio: '4:3',
      },
    ]

    const collectionList: ICollection[] = [
      {
        title: 'Temporada 1',
        order: 0,
        length: seasonOneFolderAndMediaList.length,
        submediaList: seasonOneFolderAndMediaList,
      },
      {
        title: 'Temporada 2',
        order: 1,
        length: seasonTwoFolderAndMediaList.length,
        submediaList: seasonTwoFolderAndMediaList,
      },
    ]

    const PlaylistInstance = Playlist.create({
      title: 'Bob Esponja',
      submedia: [...seasonOneFolderAndMediaList, ...seasonTwoFolderAndMediaList],
      collections: collectionList,
      isAnchor: true,
      mediaTitleId: 'asdsad',
    })

    const subMediasAsArray = PlaylistInstance.getSubmediaMapAsArray()
    const collectionsAsArray = PlaylistInstance.getCollectionMapAsArray()
    expect(subMediasAsArray).toEqual([...seasonOneFolderAndMediaList, ...seasonTwoFolderAndMediaList])
    expect(collectionsAsArray).toEqual(collectionList)
  })
})
