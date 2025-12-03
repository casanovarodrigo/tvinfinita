import * as fs from 'fs'
import { MediaDiscoveryClass } from './MediaDiscovery'
import { MediaTitleRepository } from '../MediaTitle.repository'
import { TVShowMediaRepository } from '../TVShowMedia.repository'
import { PlaylistRepository } from '../Playlist.repository'

describe('MediaDiscovery', () => {
  const testFolderPath = 'storage/test'
  const testAvailableTitles = 'dont-delete-available-titles-test.json'
  const testValidatedTitles = 'validated-titles.json'

  let MediaDiscovery: MediaDiscoveryClass = null
  let mockMediaTitleRepository: jest.Mocked<MediaTitleRepository>
  let mockTVShowMediaRepository: jest.Mocked<TVShowMediaRepository>
  let mockPlaylistRepository: jest.Mocked<PlaylistRepository>

  beforeAll(async () => {
    // Create mocks for repositories
    mockMediaTitleRepository = {
      create: jest.fn(),
      createWithMedia: jest.fn(),
      findById: jest.fn(),
      findByTitle: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any

    mockTVShowMediaRepository = {
      create: jest.fn(),
      createMany: jest.fn(),
      findById: jest.fn(),
      findByFilePath: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as any

    mockPlaylistRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByMediaTitleId: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    } as any

    // Create instance with mocked dependencies and injected string values
    MediaDiscovery = new MediaDiscoveryClass(
      mockMediaTitleRepository,
      mockTVShowMediaRepository,
      mockPlaylistRepository,
      testFolderPath,
      testAvailableTitles,
      testValidatedTitles
    )
  })

  // afterAll(async () => {
  // 	if (fs.existsSync('storage/test'))
  // 		await fs.promises.rm('storage/test', { recursive: true })
  // })

  // it('should check that validated folder doesnt exists', () => {
  // 	const doesFolderExists = fs.existsSync(testFolderPath)
  //   expect(doesFolderExists).toEqual(false)
  // })

  it('should create storage/test/validated folders', async () => {
    await MediaDiscovery.createLocalRepositoryFolders()
    const validatedFolderExists = fs.existsSync(testFolderPath)
    expect(validatedFolderExists).toBeTruthy()
  })

  it('should read available titles file', async () => {
    await MediaDiscovery.registerTitles()
    // const validatedFolderExists = fs.existsSync(testFolderPath)
    // expect(validatedFolderExists).toBeTruthy()
  })
})
