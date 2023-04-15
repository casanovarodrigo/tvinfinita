import * as fs from 'fs'
import { MediaDiscoveryClass } from "./MediaDiscovery"

describe('MediaDiscovery', () => {

	let MediaDiscovery = null
	beforeAll(() => {
		MediaDiscovery = new MediaDiscoveryClass
	})

  it('should return test result', () => {
		const res = MediaDiscovery.testFunc()
    expect(res).toEqual('test')
	})

  it('should create storage/validated folders', () => {
		const validatedFolderExists = fs.existsSync(MediaDiscovery.validatedFolderPath)
    expect(validatedFolderExists).toBeTruthy()
	})

})