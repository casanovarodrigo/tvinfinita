import * as fs from 'fs'

interface IMediaDiscovery {

	createLocalRepositoryFolders: () => void
}

export class MediaDiscoveryClass implements IMediaDiscovery {
	private storageFolderPath = ''
	private availableTitlesFile = ''
	private validatedFile = ''

	constructor(storageFolderPath: string = 'storage',
		availableTitlesFile: string = 'available-titles.json',
		validatedFile: string = 'validated-titles.json'
	){
		this.storageFolderPath = storageFolderPath
		this.availableTitlesFile = availableTitlesFile
		this.validatedFile = validatedFile
	}

	public async createLocalRepositoryFolders(): Promise<void> {
    // media storage cache folder
		try {
			await fs.promises.access(this.storageFolderPath)
		} catch (error) {
			if (error)
			fs.mkdirSync(this.storageFolderPath, { recursive: true })
		}
    // const validatedFolderExists = fs.mkdirSync(this.validatedFolderPath, { recursive: true })
    // if (!validatedFolderExists){
    //     fs.mkdirSync(this.validatedFolderPath, { recursive: true })
    // }
	}

	/**
 * Register current available titles using a template accordingly to its type specified in storage/available-titles.json
 * and save as a new file to storage/validated/at.json
 * also calls the function to save to firestore db
 * @returns {Array} List of title objects
 * @throws {Error} if available-titles.json file is missing
 */
	public async registerTitles() {
		try {
			await fs.promises.access(this.availableTitlesFile)
		} catch (error) {
			// if(error){
			// 		throw new Error('available titles file missing')
			// }
		}
    
    // get all titles
    const unvalidatedFile = await fs.promises.readFile(`${this.storageFolderPath}/${this.availableTitlesFile}`, 'utf8')
    const list = JSON.parse(unvalidatedFile)

		const promises = Object.keys(list).map(async(titleKey) => {
				let info = {}
				if (list[titleKey].type = 'serie') info = await getSerieRegInfo(titleKey, list[titleKey])
				// TO-DO: implement movie registration pipeline
				// else if (title.type = 'filme') info = getMovieRegInfo(title)
				// TO-DO: implement collection registration pipeline. Collections are small like trilogies or jackie chan movies
				// else if (title.type = 'colecao') info = getCollectionRegInfo(title)

				return info
		})

		console.log('list', list)
	}

}