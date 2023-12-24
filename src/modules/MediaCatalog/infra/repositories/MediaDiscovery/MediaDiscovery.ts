import * as fs from 'fs'
import { getVideoMetadata } from '#mediaCatalog/infra/helpers/video'

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
			await fs.promises.access(`${this.storageFolderPath}/${this.availableTitlesFile}`)
		} catch (error) {
			if(error){
				console.log('error', error)
				throw new Error('available titles file missing')
			}
		}
    
    // get all titles
    const unvalidatedFile = await fs.promises.readFile(`${this.storageFolderPath}/${this.availableTitlesFile}`, 'utf8')
    const list = JSON.parse(unvalidatedFile)

		const getSeriesRegInfoPromises = Object.keys(list).map(async(titleKey) => {
				let info: any = {}
				if (list[titleKey].type = 'serie') info = await this.getSerieRegInfo(titleKey, list[titleKey])
				// TO-DO: implement movie registration pipeline
				// else if (title.type = 'filme') info = getMovieRegInfo(title)
				// TO-DO: implement collection registration pipeline. Collections are small like trilogies or jackie chan movies
				// else if (title.type = 'colecao') info = getCollectionRegInfo(title)
				return info
		})

		try {
			// console.log('list', list)

			const titleList = await Promise.all(getSeriesRegInfoPromises)

			// console.log('titleList', titleList)

			// console.log('titleList', titleList[0].seasonsInfo)
			// writ to json file
			if ((process.env.NODE_ENV != 'production')){
				await fs.promises.writeFile(`${this.storageFolderPath}/pretty_${this.validatedFile}`, JSON.stringify(titleList, null, 2), 'utf8')
		}
		const json = JSON.stringify(titleList)
		await fs.promises.writeFile(`${this.storageFolderPath}/${this.validatedFile}`, json, 'utf8')
		return titleList[0]
		} catch (error) {
			console.log('registerTitles', error)
		}

	}

	public async getEpisodeList(titleObj: any){
		const seasonsList = await this.getTitleSubFiles(titleObj)
    const merged = [].concat.apply([], seasonsList); // squash all season files into a single array
		// console.log('merged', merged)
		const seasonsPromises = merged.map(async (episodeName: string) => {
			const seasonNumberRegex = episodeName.match(/[s|S]([0-9]+)E[0-9]+/)
			const seasonNumber = parseInt(seasonNumberRegex[1])
			const path = titleObj.path + '/Temporada ' + seasonNumber

			// console.log('path', path)

			const episodeMetadata = await getVideoMetadata(path + '/' + episodeName)
			// console.log('episodeMetadata', episodeMetadata)
			return {
					fileName: episodeName,
					metadata: episodeMetadata
			}
		})
		
		return Promise.all(seasonsPromises)
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

		try {
			const episodeList: any[] = await this.getEpisodeList(titleObj)
			
			let seasonNumberRegex
			let seasonNumber
			let epNumberRegex
			let epNumber
			let tempInfo
			let seasonsInfo = {}
			let totalTitleDuration = 0
			let totalEpisodeCount = 0
			let doubleEpisode = false

			// console.log('episodeList', episodeList)
	
			// every episode sequentially in one array
			episodeList.forEach(ep => {
					
					doubleEpisode = false // reset to false at start
					// get season number by regex
					seasonNumberRegex = ep.fileName.match(/[s|S]([0-9]+)E[0-9]+/)
					seasonNumber = parseInt(seasonNumberRegex[1])
					// get ep numer by regex
					epNumberRegex = ep.fileName.match(/[s|S][0-9]+[e|E]([0-9-]+)/)
					epNumber = parseInt(epNumberRegex[1])
					// tests if episode is a double episode by regex
					let doubleEpRegex = new RegExp(/[0-9]+-[0-9]+/)
					if (doubleEpRegex.test(ep.fileName)){
							doubleEpisode = true
					}
					seasonsInfo[seasonNumber] = seasonsInfo[seasonNumber]? seasonsInfo[seasonNumber] : {} // objeto ja criado ou um vazio
					
					tempInfo = seasonsInfo[seasonNumber]
	
					// season number
					if (tempInfo && !tempInfo.number){
							tempInfo.number = seasonNumber
					}
	
					// duration
					if (tempInfo && (!tempInfo.duration || isNaN(tempInfo.duration))){
							tempInfo.duration = 0
					}

					// console.log('tempInfo', tempInfo)
					// return ep
					tempInfo.duration += ep.metadata.duration
					totalTitleDuration += ep.metadata.duration
	
					// season size/length
					if (tempInfo && (!tempInfo.size || isNaN(tempInfo.size))){
							tempInfo.size = 0
					}
					tempInfo.size += 1
					totalEpisodeCount += 1
	
					// season interval in the total  map array ex.: [30-68]
					// if interval for that season is not set, set default
					if (tempInfo && (!tempInfo.interval || !Array.isArray(tempInfo.interval))){
							if (seasonNumber == 1){
									// if first season
									tempInfo.interval = [1, 0]
							} else {
									// gets previous season interval end
									tempInfo.interval = [seasonsInfo[seasonNumber-1].interval[1] + 1, seasonsInfo[seasonNumber-1].interval[1]]
							}
					}
					tempInfo.interval[1] += 1
	
					// episode list
					if (tempInfo && (!tempInfo.episodeList && !Array.isArray(tempInfo.episodeList))){
							tempInfo.episodeList = []
					}
	
					// TO-DO: change file extensions in here as well
					const splitAtFileExtension = new RegExp(/(.*)\.(avi|mkv|mp4)$/)
					const matches = ep.fileName.match(splitAtFileExtension)
					let episodeObject = {
							season: seasonNumber, // not being used for now
							order: epNumber,
							name: matches[1],
							ext: matches[2],
							type: titleObj.type,
							path: titleObj.path + '/Temporada ' + seasonNumber,
							duration: ep.metadata.duration,
							height: ep.metadata.height,
							width: ep.metadata.width,
							ratio: ep.metadata.ratio
					}
					// if episode is a double episode ex.: s05e36-37
					// later if need more than double like s05e36-37-38 make a multiple episode flag with quantity of eps
					// TO-DO fix typescript, insert interfaces
					if (doubleEpisode) (episodeObject as any).doubleEpisode = doubleEpisode
	
					tempInfo.episodeList.push(episodeObject)
	
					if (doubleEpisode) {
							tempInfo.episodeList.push({
									season: seasonNumber,
									order: epNumber + 1,
									next_of_double_episode: true 
							})
					}
	
					seasonsInfo[seasonNumber] = tempInfo
					tempInfo = null
			})
	
			// set season duration decimal to 2
			Object.keys(seasonsInfo).forEach(seasonKey => {
					seasonsInfo[seasonKey].duration = parseFloat(seasonsInfo[seasonKey].duration).toFixed(2)
			})
	
			return {
					name: titleObj.name,
					titleKey: titleKey,
					type: titleObj.type,
					episodeCount: totalEpisodeCount,
					// To-DO: remove this ts monster
					totalTitleDuration: parseFloat((totalTitleDuration as unknown as string)).toFixed(2),
					seasonsInfo
			}

			
		} catch (error) {
			console.error('getSerieRegInfo error', error)
			throw new Error('error trying to get series registration info')
		}

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
			throw new Error('error trying to get subfiles from title')
		}
	}

}