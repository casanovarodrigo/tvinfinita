import * as fs from 'fs'
import { Injectable, Optional, Inject } from '@nestjs/common'
import { getVideoMetadata } from '#mediaCatalog/infra/helpers/video'
import { MediaTitleRepository } from '../MediaTitle.repository'
import { TVShowMediaRepository } from '../TVShowMedia.repository'
import { PlaylistRepository } from '../Playlist.repository'
import { MediaTitle } from '#mediaCatalog/domain/entities/MediaTitle'
import { Playlist } from '#mediaCatalog/domain/entities/Playlist'
import { TVShowMedia } from '#mediaCatalog/domain/entities/TVShowMedia'
import { DomainID } from '#ddd/primitives/domain-id'
import { ITVShowMediaDTO } from '#mediaCatalog/domain/entities/TVShowMedia/interfaces'

interface IMediaDiscovery {
  createLocalRepositoryFolders: () => void
}

interface IAvailableTitle {
  name: string
  path: string
  type: 'tvshow' | 'movie'
  slug: string
}

interface IMediaFileBasicInfo {
  fileName: string
  path: string
  folderName: string
}
interface IMediaInfo {
  fileInfo: IMediaFileBasicInfo
  metadata: {
    height: number
    width: number
    ratio: string
    duration: number
    bitrate: number
  }
}
interface IEpisodeMetadata {
  fileName: string
  folderName: string
  ext: string
  type: string
  path: string
  duration: number
  height: number
  width: number
  ratio: string
  // order?: number
  // next_of_double_episode?: boolean
}

interface ITvShowRegistration {
  name: string
  type: 'tvshow'
  seasonsInfo: IEpisodeMetadata[][] // Array of seasons, each season is an array of episodes
}

@Injectable()
export class MediaDiscoveryClass implements IMediaDiscovery {
  private storageFolderPath = ''
  private availableTitlesFile = ''
  private validatedFile = ''
  private prohibitedFormats = new RegExp(/\.(srt)$/)
  private allowedFormats = new RegExp(/\.(avi|mkv|mp4)$/)

  constructor(
    private readonly mediaTitleRepository: MediaTitleRepository,
    private readonly tvShowMediaRepository: TVShowMediaRepository,
    private readonly playlistRepository: PlaylistRepository,
    @Optional() @Inject('STORAGE_FOLDER_PATH') storageFolderPath?: string,
    @Optional() @Inject('AVAILABLE_TITLES_FILE') availableTitlesFile?: string,
    @Optional() @Inject('VALIDATED_FILE') validatedFile?: string
  ) {
    this.storageFolderPath = storageFolderPath || 'storage'
    this.availableTitlesFile = availableTitlesFile || 'available-titles.json'
    this.validatedFile = validatedFile || 'validated-titles.json'
  }

  public async createLocalRepositoryFolders(): Promise<void> {
    // media storage cache folder
    try {
      await fs.promises.access(this.storageFolderPath)
    } catch {
      fs.mkdirSync(this.storageFolderPath, { recursive: true })
    }
  }

  /**
   * Register current available titles using a template accordingly to its type specified in storage/available-titles.json
   * Validates and normalizes data, then saves to PostgreSQL via repositories
   * @returns {Promise<void>}
   * @throws {Error} if available-titles.json file is missing
   */
  public async registerTitles(): Promise<void> {
    try {
      await fs.promises.access(`${this.storageFolderPath}/${this.availableTitlesFile}`)
    } catch (error) {
      if (error) {
        console.log('error', error)
        throw new Error('available titles file missing')
      }
    }

    // Get all titles from unvalidated source
    const unvalidatedFile = await fs.promises.readFile(
      `${this.storageFolderPath}/${this.availableTitlesFile}`,
      'utf8'
    )
    const list: IAvailableTitle[] = JSON.parse(unvalidatedFile)

    // Process each title: validate, transform, and persist
    const registrationPromises = Object.keys(list).map(async (titleIndex) => {
      const titleObj = list[titleIndex]
      if (titleObj.type === 'tvshow') {
        return await this.registerTVShow(titleObj)
      }
      // TO-DO: implement movie registration pipeline
      // else if (title.type === 'movie') return await this.registerMovie(titleObj)
      // TO-DO: implement collection registration pipeline
      // else if (title.type === 'collection') return await this.registerCollection(titleObj)
      return null
    })

    await Promise.all(registrationPromises)
  }

  /**
   * Registers a TV Show: validates, wipes existing data, and saves to database
   */
  private async registerTVShow(titleObj: IAvailableTitle): Promise<void> {
    // Step 1: Validate and get registration info
    const registrationInfo = await this.getTVShowRegistrationInfo(0, titleObj)

    // Step 2: Wipe existing title if it exists
    await this.wipeExistingTitle(registrationInfo.name)

    // Step 3: Transform validated data to domain entities
    const { mediaTitle, tvShowMediaList } = await this.transformToDomainEntities(registrationInfo)

    // Step 4: Persist to database
    // Save everything in a single transaction (TVShowMedia + MediaTitle + Playlist)
    // This ensures atomicity - if any part fails, everything is rolled back
    await this.mediaTitleRepository.createWithMedia(mediaTitle, tvShowMediaList)
  }

  /**
   * Wipes existing title data completely before creating new one
   * Delegates to aggregate root repository to handle cascade deletion
   */
  private async wipeExistingTitle(title: string): Promise<void> {
    const existingTitle = await this.mediaTitleRepository.findByTitle(title)
    if (!existingTitle) {
      return // Nothing to wipe
    }

    // Aggregate root handles deletion of its entire boundary
    await this.mediaTitleRepository.delete(existingTitle.id.value)
  }

  /**
   * Transforms validated registration info to domain entities
   */
  private async transformToDomainEntities(
    registrationInfo: ITvShowRegistration
  ): Promise<{ mediaTitle: MediaTitle; tvShowMediaList: TVShowMedia[] }> {
    // Flatten seasonsInfo (2D array) into single array of episodes
    const allEpisodes: IEpisodeMetadata[] = []
    for (const season of registrationInfo.seasonsInfo) {
      if (Array.isArray(season)) {
        allEpisodes.push(...season)
      }
    }

    // Transform episodes to TVShowMedia domain entities
    const tvShowMediaList: TVShowMedia[] = []
    for (const episode of allEpisodes) {
      const tvShowMediaDTO: ITVShowMediaDTO = {
        id: DomainID.create().value, // Generate new UUID
        title: registrationInfo.name,
        fileName: episode.fileName,
        folderName: episode.folderName,
        fileExt: episode.ext,
        filePath: episode.path,
        duration: episode.duration,
        height: episode.height,
        width: episode.width,
        ratio: episode.ratio,
      }

      const result = TVShowMedia.create(tvShowMediaDTO)
      if (result.isFailure) {
        throw new Error(`Failed to create TVShowMedia for ${episode.fileName}: ${result.error.message}`)
      }

      tvShowMediaList.push(result.result)
    }

    // Create Playlist (anchor/base playlist) with all episodes
    const playlistDTO = {
      title: `${registrationInfo.name} - Base Playlist`,
      isAnchor: true,
      mediaTitleId: null, // Will be set when MediaTitle is created
      submedia: tvShowMediaList.map((media) => media.DTO),
    }

    const basePlaylist = Playlist.create(playlistDTO)

    // Create MediaTitle aggregate root
    const mediaTitle = MediaTitle.create(registrationInfo.name, basePlaylist, registrationInfo.type)

    return { mediaTitle, tvShowMediaList }
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
  public async getTVShowRegistrationInfo(
    titleKey: string | number,
    titleObj: any
  ): Promise<ITvShowRegistration> {
    try {
      const episodeList = await this.getEpisodeList(titleObj)
      // console.log('episodeList', episodeList)
      // const seasonsInfo = {}
      const seasonsInfo = []
      // const totalTitleDuration = 0
      // let totalEpisodeCount = 0
      // let doubleEpisodeCount = 0
      // console.log('episodeList', episodeList)
      const uniqueFolderNames = episodeList.filter(
        (obj, index, self) =>
          index === self.findIndex((t) => t.fileInfo.folderName === obj.fileInfo.folderName)
      )

      // console.log('uniqueFolderNames', uniqueFolderNames)
      // every episode sequentially in one array
      episodeList.forEach((ep) => {
        // let doubleEpisode = false
        let tempInfo: IEpisodeMetadata[]

        // console.log('uniqueFolderNames', uniqueFolderNames)
        // console.log('ep.fileInfo.folderName', ep.fileInfo.folderName)

        const seasonNumber = uniqueFolderNames.findIndex((item: IMediaInfo) => {
          return item.fileInfo.folderName === ep.fileInfo.folderName
        })
        // const epNumber = index + doubleEpisodeCount

        // get season number by regex
        // seasonNumberRegex = ep.fileInfo.fileName.match(/[s|S]([0-9]+)E[0-9]+/)
        // seasonNumber = parseInt(seasonNumberRegex[1])
        // get ep numer by regex
        // epNumberRegex = ep.fileInfo.fileName.match(/[s|S][0-9]+[e|E]([0-9-]+)/)
        // epNumber = parseInt(epNumberRegex[1])
        // tests if episode is a double episode by regex
        // const doubleEpRegex = new RegExp(/[0-9]+-[0-9]+/)
        // if (doubleEpRegex.test(ep.fileInfo.fileName)) {
        //   doubleEpisode = true
        //   doubleEpisodeCount++
        // }
        seasonsInfo[seasonNumber] = seasonsInfo[seasonNumber] ?? [] // objeto ja criado ou um vazio
        tempInfo = seasonsInfo[seasonNumber]

        // season number
        // if (tempInfo && !tempInfo.number) {
        //   tempInfo.number = seasonNumber
        // }

        // duration
        // if (tempInfo && (!tempInfo.duration || isNaN(tempInfo.duration))) {
        //   tempInfo.duration = 0
        // }

        // tempInfo.duration += ep.metadata.duration
        // totalTitleDuration += ep.metadata.duration

        // season size/length
        // if (tempInfo && (!tempInfo.size || isNaN(tempInfo.size))) {
        //   tempInfo.size = 0
        // }
        // tempInfo.size += 1
        // totalEpisodeCount += 1

        // season interval in the total  map array ex.: [30-68]
        // if interval for that season is not set, set default
        // if (tempInfo && (!tempInfo.interval || !Array.isArray(tempInfo.interval))) {
        //   if (
        //     (seasonsInfo[0].number == 0 && seasonNumber == 0) ||
        //     (seasonsInfo[0].number != 0 && seasonNumber == 1)
        //   ) {
        //     // if first season
        //     tempInfo.interval = [1, 0]
        //   } else {
        //     // gets previous season interval end
        //     tempInfo.interval = [
        //       seasonsInfo[seasonNumber - 1].interval[1] + 1,
        //       seasonsInfo[seasonNumber - 1].interval[1],
        //     ]
        //   }
        // } else {
        //   tempInfo.interval[1] += 1
        // }

        // episode list
        // if (tempInfo && !tempInfo.episodeList && !Array.isArray(tempInfo.episodeList)) {
        //   tempInfo.episodeList = []
        // }

        // TO-DO: change file extensions in here as well
        const splitAtFileExtension = new RegExp(/(.*)\.(avi|mkv|mp4)$/)
        const matches = ep.fileInfo.fileName.match(splitAtFileExtension)
        const episodeObject: IEpisodeMetadata = {
          // order: epNumber + 1 - tempInfo.interval[0] - (seasonNumber > 0 ? 1 : 0),
          fileName: matches[1],
          folderName: ep.fileInfo.folderName,
          ext: matches[2],
          type: titleObj.type,
          path: ep.fileInfo.path,
          duration: ep.metadata.duration,
          height: ep.metadata.height,
          width: ep.metadata.width,
          ratio: ep.metadata.ratio,
        }
        // if episode is a double episode ex.: s05e36-37
        // TO-DO fix typescript, insert interfaces
        // if (doubleEpisode) (episodeObject as any).doubleEpisode = doubleEpisode

        tempInfo.push(episodeObject)

        // if (doubleEpisode) {
        //   tempInfo.push({
        //     ...episodeObject,
        //     season: seasonNumber,
        //     // order: index + doubleEpisodeCount + 1,
        //     // next_of_double_episode: true,
        //   })
        // }

        seasonsInfo[seasonNumber] = tempInfo
        tempInfo = null
      })

      // // set season duration decimal to 2
      // Object.keys(seasonsInfo).forEach((seasonKey) => {
      //   seasonsInfo[seasonKey].duration = parseFloat(seasonsInfo[seasonKey].duration).toFixed(2)
      // })

      return {
        name: titleObj.name,
        type: titleObj.type,
        seasonsInfo,
      }
    } catch (error) {
      console.error('getTVShowRegistrationInfo error', error)
      throw new Error('error trying to get tv show registration info')
    }
  }

  public async getEpisodeList(unregisteredTitle: IAvailableTitle): Promise<IMediaInfo[]> {
    const seasonsList: IMediaFileBasicInfo[][] = await this.getMediaFilesBasicInfo(unregisteredTitle)
    const orderedSeasonList: IMediaFileBasicInfo[][] = seasonsList.map((list) => {
      return list.sort((a, b) => {
        if (parseInt(a.fileName) < parseInt(b.fileName)) {
          return -1
        } else if (parseInt(a.fileName) > parseInt(b.fileName)) {
          return 1
        } else {
          return 0
        }
      })
    })
    const merged: IMediaFileBasicInfo[] = [].concat(...orderedSeasonList) // squash all season files into a single array
    const seasonsPromises = merged.map(async (episodeFile) => {
      const path = episodeFile.path
      const episodeMetadata = await getVideoMetadata(path + '/' + episodeFile.fileName)
      return {
        fileInfo: episodeFile,
        metadata: episodeMetadata,
      }
    })

    return Promise.all(seasonsPromises)
  }

  /**
   * Get title files from subfolders filtering unallowed file formats
   * @param {IAvailableTitle} unregisteredTitle title info of the title be found and returned
   * @returns {Array} bi-dimensional array of subfolders and its files in alphabetic order
   * empty folders area filtered from result
   */
  public async getMediaFilesBasicInfo(unregisteredTitle: IAvailableTitle) {
    const subfolders = await fs.promises.readdir(unregisteredTitle.path)
    const subfoldersPromises = subfolders.map(async (subName) => {
      const path = unregisteredTitle.path + '/' + subName
      const files = await fs.promises.readdir(path)
      const filteredFiles = files.filter(
        (file) => !this.prohibitedFormats.test(file) && this.allowedFormats.test(file)
      )
      const filesWithInfo: IMediaFileBasicInfo[] = filteredFiles.map((fileName: string) => {
        return {
          fileName,
          path,
          folderName: subName,
        }
      })
      return filesWithInfo
    })

    try {
      const fileList = await Promise.all(subfoldersPromises)
      return fileList.filter((arr) => arr.length >= 1)
    } catch (error) {
      console.log('getTitleSubFiles error', error)
      throw new Error('error trying to get subfiles from title')
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
  // public async getTVShowRegistrationInfoOld(titleKey: string, titleObj: any) {
  //   try {
  //     const episodeList: any[] = await this.getEpisodeList(titleObj)

  //     let seasonNumberRegex
  //     let seasonNumber
  //     let epNumberRegex
  //     let epNumber
  //     let tempInfo
  //     const seasonsInfo = {}
  //     let totalTitleDuration = 0
  //     let totalEpisodeCount = 0
  //     let doubleEpisode = false

  //     // console.log('episodeList', episodeList)

  //     // every episode sequentially in one array
  //     episodeList.forEach((ep) => {
  //       doubleEpisode = false // reset to false at start
  //       // get season number by regex
  //       seasonNumberRegex = ep.fileName.match(/[s|S]([0-9]+)E[0-9]+/)
  //       seasonNumber = parseInt(seasonNumberRegex[1])
  //       // get ep numer by regex
  //       epNumberRegex = ep.fileName.match(/[s|S][0-9]+[e|E]([0-9-]+)/)
  //       epNumber = parseInt(epNumberRegex[1])
  //       // tests if episode is a double episode by regex
  //       const doubleEpRegex = new RegExp(/[0-9]+-[0-9]+/)
  //       if (doubleEpRegex.test(ep.fileName)) {
  //         doubleEpisode = true
  //       }
  //       seasonsInfo[seasonNumber] = seasonsInfo[seasonNumber] ? seasonsInfo[seasonNumber] : {} // objeto ja criado ou um vazio

  //       tempInfo = seasonsInfo[seasonNumber]

  //       // season number
  //       if (tempInfo && !tempInfo.number) {
  //         tempInfo.number = seasonNumber
  //       }

  //       // duration
  //       if (tempInfo && (!tempInfo.duration || isNaN(tempInfo.duration))) {
  //         tempInfo.duration = 0
  //       }

  //       // console.log('tempInfo', tempInfo)
  //       // return ep
  //       tempInfo.duration += ep.metadata.duration
  //       totalTitleDuration += ep.metadata.duration

  //       // season size/length
  //       if (tempInfo && (!tempInfo.size || isNaN(tempInfo.size))) {
  //         tempInfo.size = 0
  //       }
  //       tempInfo.size += 1
  //       totalEpisodeCount += 1

  //       // season interval in the total  map array ex.: [30-68]
  //       // if interval for that season is not set, set default
  //       if (tempInfo && (!tempInfo.interval || !Array.isArray(tempInfo.interval))) {
  //         if (seasonNumber == 1) {
  //           // if first season
  //           tempInfo.interval = [1, 0]
  //         } else {
  //           // gets previous season interval end
  //           tempInfo.interval = [
  //             seasonsInfo[seasonNumber - 1].interval[1] + 1,
  //             seasonsInfo[seasonNumber - 1].interval[1],
  //           ]
  //         }
  //       }
  //       tempInfo.interval[1] += 1

  //       // episode list
  //       if (tempInfo && !tempInfo.episodeList && !Array.isArray(tempInfo.episodeList)) {
  //         tempInfo.episodeList = []
  //       }

  //       // TO-DO: change file extensions in here as well
  //       const splitAtFileExtension = new RegExp(/(.*)\.(avi|mkv|mp4)$/)
  //       const matches = ep.fileName.match(splitAtFileExtension)
  //       const episodeObject = {
  //         season: seasonNumber, // not being used for now
  //         order: epNumber,
  //         name: matches[1],
  //         ext: matches[2],
  //         type: titleObj.type,
  //         path: titleObj.path + '/Temporada ' + seasonNumber,
  //         duration: ep.metadata.duration,
  //         height: ep.metadata.height,
  //         width: ep.metadata.width,
  //         ratio: ep.metadata.ratio,
  //       }
  //       // if episode is a double episode ex.: s05e36-37
  //       // later if need more than double like s05e36-37-38 make a multiple episode flag with quantity of eps
  //       // TO-DO fix typescript, insert interfaces
  //       if (doubleEpisode) (episodeObject as any).doubleEpisode = doubleEpisode

  //       tempInfo.episodeList.push(episodeObject)

  //       if (doubleEpisode) {
  //         tempInfo.episodeList.push({
  //           season: seasonNumber,
  //           order: epNumber + 1,
  //           next_of_double_episode: true,
  //         })
  //       }

  //       seasonsInfo[seasonNumber] = tempInfo
  //       tempInfo = null
  //     })

  //     // set season duration decimal to 2
  //     Object.keys(seasonsInfo).forEach((seasonKey) => {
  //       seasonsInfo[seasonKey].duration = parseFloat(seasonsInfo[seasonKey].duration).toFixed(2)
  //     })

  //     return {
  //       name: titleObj.name,
  //       titleKey: titleKey,
  //       type: titleObj.type,
  //       episodeCount: totalEpisodeCount,
  //       // To-DO: remove this ts monster
  //       totalTitleDuration: parseFloat(totalTitleDuration as unknown as string).toFixed(2),
  //       seasonsInfo,
  //     }
  //   } catch (error) {
  //     console.error('getTVShowRegistrationInfo error', error)
  //     throw new Error('error trying to get tv show registration info')
  //   }
  // }

  /**
   * Get title files from subfolders filtering unallowed file formats
   * @param {Object} titleObj title info of the title be found and returned
   * @returns {Array} bi-dimensional array of subfolders and its files in alphabetic order
   * empty folders area filtered from result
   */
  // public async getTitleSubFiles(titleObj: any) {
  //   const subfolders = await fs.promises.readdir(titleObj.path)

  //   const subfoldersPromises = subfolders.map(async (subName) => {
  //     const path = titleObj.path + '/' + subName
  //     const files = await fs.promises.readdir(path)
  //     return files.filter((file) => !this.prohibitedFormats.test(file) && this.allowedFormats.test(file))
  //   })

  //   try {
  //     const fileList = await Promise.all(subfoldersPromises)
  //     return fileList.filter((arr) => arr.length >= 1)
  //   } catch (error) {
  //     console.log('getTitleSubFiles error', error)
  //     throw new Error('error trying to get subfiles from title')
  //   }
  // }
}
