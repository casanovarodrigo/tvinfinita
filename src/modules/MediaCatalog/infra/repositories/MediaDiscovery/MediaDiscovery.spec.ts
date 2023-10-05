import * as fs from 'fs'
import { MediaDiscoveryClass } from "./MediaDiscovery"

describe('MediaDiscovery', () => {

	const testFolderPath = 'storage/test'
	const testAvailableTitles = 'available-titles.json'
	const testValidatedTitles = 'validated-titles.json'
	
	let MediaDiscovery = null
	beforeAll(async () => {
		// if (fs.existsSync(testFolderPath))
			// await fs.promises.rm('storage/test', { recursive: true })

		MediaDiscovery = new MediaDiscoveryClass(testFolderPath, testAvailableTitles, testValidatedTitles)
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