import * as fs from 'fs'

interface IMediaDiscovery {

	createLocalRepositoryFolders: () => void
}

export class MediaDiscoveryClass implements IMediaDiscovery {
	private storageFolderPath = ''
	private availableTitlesFile = ''
	private validatedFile = ''
	private prohibitedFormats = new RegExp(/\.(srt)$/)
	private allowedFormats = new RegExp(/\.(avi|mkv|mp4)$/)


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
				let info: any = {}
				if (list[titleKey].type = 'serie') info = await this.getSerieRegInfo(titleKey, list[titleKey])
				// TO-DO: implement movie registration pipeline
				// else if (title.type = 'filme') info = getMovieRegInfo(title)
				// TO-DO: implement collection registration pipeline. Collections are small like trilogies or jackie chan movies
				// else if (title.type = 'colecao') info = getCollectionRegInfo(title)

				return info
		})

		try {
			console.log('list', list)

			const titleList = await Promise.all(promises)

			console.log('titleList', titleList)
		} catch (error) {
			console.log('registerTitles', error)
		}

	}

	/**
	 * Gets information about the show for registration
	* in a linear way O(n)
	* @param {String} titleKey title object key
	* @param {Object} titleObj title info object
	* @returns {Object} Title informations [name, titleKey, type, episodeCout, totalTitleDuration, seasonInfo]
	* @resolve Array list of existing scenes
	* @reject errorPipe handler
	*/
	public async getSerieRegInfo(titleKey: string, titleObj: any){

		const seasonsList = await this.getTitleSubFiles(titleObj)
    // merge all season files into one single array
    const merged = [].concat.apply([], seasonsList);
		const seasonsPromises = merged.map(async (episodeName) => {
			const seasonNumberRegex = episodeName.match(/[s|S]([0-9]+)E[0-9]+/)
			const seasonNumber = parseInt(seasonNumberRegex[1])
			const path = titleObj.path + '/Temporada ' + seasonNumber

			// const episodeMetadata = await getVideoMetadata(path + '/' + episodeName)
			// console.log('episodeMetadata', episodeMetadata)
			return {
					fileName: episodeName,
					// metadata: episodeMetadata
			}			
		})

		try {
			const episodeList = await Promise.all(seasonsPromises)
			return episodeList
		} catch (error) {
			console.log('getSerieRegInfo error', error)
		}

		let seasonNumberRegex
		let seasonNumber
		let epNumberRegex
		let epNumber
		let tempInfo
		let seasonsInfo = {}
		let totalTitleDuration = 0
		let totalEpisodeCount = 0
		let doubleEpisode = false

		
	}

	/**
	 * Get title files from subfolders filtering unallowed file formats
	 * @param {Object} titleObj title info of the title be found and returned
	 * @returns {Array} bi-dimensional array of subfolders and its files in alphabetic order
	 * empty folders area filtered from result
	 */
	public async getTitleSubFiles(titleObj: any) {
		const subfolders = await fs.promises.readdir(titleObj.path)

		const subfoldersPromises = subfolders.map(async (subName) => {
			const path = titleObj.path + '/' + subName
			const files = await fs.promises.readdir(path)
			return files.filter(file => !this.prohibitedFormats.test(file) && this.allowedFormats.test(file))
		})

		try {
			const fileList = await Promise.all(subfoldersPromises)
			return fileList.filter(arr => arr.length >= 1)
		} catch (error) {
			console.log('getTitleSubFiles error', error)
		}

		// return list.filter(arr => arr.length >= 1)
	}

}