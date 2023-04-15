import * as fs from 'fs'

interface IMediaDiscovery {
	createLocalRepositoryFolders: () => void
}

export class MediaDiscoveryClass implements IMediaDiscovery {
	public validatedFolderPath = 'storage/validated'

	constructor(){
		this.createLocalRepositoryFolders()
	}


	public createLocalRepositoryFolders(): void {
    // media storage cache folder
    const validatedFolderExists = fs.existsSync(this.validatedFolderPath)
    if (!validatedFolderExists){
        fs.mkdirSync(this.validatedFolderPath, { recursive: true })
    }
}
}