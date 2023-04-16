import { ISubMediaDTO } from "../SubMedia/interfaces"
import { ICollection } from "../interfaces"
import { Playlist } from "."


describe('MediaDiscovery', () => {

  it('should create a Playlist from a unidimensional folder', () => {
		const mediaList: ISubMediaDTO[] = [
			{
				fileName: 'S01E01.avi',
				mediaName: 'Episódio 1',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E02.avi',
				mediaName: 'Episódio 2',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E03.avi',
				mediaName: 'Episódio 3',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E04.avi',
				mediaName: 'Episódio 4',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E05.avi',
				mediaName: 'Episódio 5',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			}
		]

		const PlaylistInstance = Playlist.create('Bob Esponja', mediaList)

		const subMediasAsArray = PlaylistInstance.getSubmediaMapAsArray()
		const collectionsAsArray = PlaylistInstance.getCollectionMapAsArray()
    expect(subMediasAsArray).toEqual(mediaList)
    expect(collectionsAsArray).toEqual(undefined)
	})

	it('should create a Playlist from a bidimensional folder', () => {
		const seasonOneFolderAndMediaList: ISubMediaDTO[] = [
			{
				fileName: 'S01E01.avi',
				mediaName: 'Episódio 1',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E02.avi',
				mediaName: 'Episódio 2',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E03.avi',
				mediaName: 'Episódio 3',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E04.avi',
				mediaName: 'Episódio 4',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S01E05.avi',
				mediaName: 'Episódio 5',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			}
		]
		const seasonTwoFolderAndMediaList: ISubMediaDTO[] = [
			{
				fileName: 'S02E01.avi',
				mediaName: 'Episódio 1',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S02E02.avi',
				mediaName: 'Episódio 2',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S02E03.avi',
				mediaName: 'Episódio 3',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S02E04.avi',
				mediaName: 'Episódio 4',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			},
			{
				fileName: 'S02E05.avi',
				mediaName: 'Episódio 5',
				fileExtension: 'avi',
				filePath: 'E:/Stream/TvInfinita/Repository/Bob Esponja'
			}
		]

		const collectionList: ICollection[] = [
			{
				title: 'Temporada 1',
				order: 0,
				length: seasonOneFolderAndMediaList.length,
				submediaList: seasonOneFolderAndMediaList
			},
			{
				title: 'Temporada 2',
				order: 1,
				length: seasonTwoFolderAndMediaList.length,
				submediaList: seasonTwoFolderAndMediaList
			}
		]

		const PlaylistInstance = new Playlist(
			'Bob Esponja',
			[...seasonOneFolderAndMediaList, ...seasonTwoFolderAndMediaList],
			collectionList
		)

		const subMediasAsArray = PlaylistInstance.getSubmediaMapAsArray()
		const collectionsAsArray = PlaylistInstance.getCollectionMapAsArray()
    expect(subMediasAsArray).toEqual([
			...seasonOneFolderAndMediaList,
			...seasonTwoFolderAndMediaList
		])
    expect(collectionsAsArray).toEqual(collectionList)
	})


})