import { Controller, Get, Post, Param, HttpCode, HttpStatus } from '@nestjs/common'
import { MediaDiscoveryClass } from '../repositories/MediaDiscovery/MediaDiscovery'
import { MediaTitleRepository } from '../repositories/MediaTitle.repository'

@Controller('api/media')
export class MediaRegistrationController {
  constructor(
    private readonly mediaDiscovery: MediaDiscoveryClass,
    private readonly mediaTitleRepository: MediaTitleRepository
  ) {}

  /**
   * Register all titles from available-titles.json
   * Validates, transforms, and saves to PostgreSQL
   */
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async registerAllTitles(): Promise<{ message: string; success: boolean }> {
    try {
      await this.mediaDiscovery.registerTitles()
      return {
        message: 'All titles registered successfully',
        success: true,
      }
    } catch (error) {
      return {
        message: error.message || 'Failed to register titles',
        success: false,
      }
    }
  }

  /**
   * Get all registered media titles
   */
  @Get('titles')
  async getAllTitles(): Promise<MediaTitleResponseDTO[]> {
    const titles = await this.mediaTitleRepository.findAll()
    return titles.map((title) => this.toResponseDTO(title))
  }

  /**
   * Get a specific media title by ID
   */
  @Get('titles/:id')
  async getTitleById(@Param('id') id: string): Promise<MediaTitleResponseDTO | null> {
    const title = await this.mediaTitleRepository.findById(id)
    if (!title) {
      return null
    }
    return this.toResponseDTO(title)
  }

  /**
   * Converts domain MediaTitle to response DTO
   */
  private toResponseDTO(title: any): MediaTitleResponseDTO {
    return {
      id: title.id.value,
      title: title.title,
      type: title.type,
      basePlaylist: {
        id: title.basePlaylist.id.value,
        title: title.basePlaylist.title,
        isAnchor: title.basePlaylist.isAnchor,
        mediaTitleId: title.basePlaylist.mediaTitleId,
        submediaCount: title.basePlaylist.getSubmediaMapAsArray().length,
      },
    }
  }
}

interface MediaTitleResponseDTO {
  id: string
  title: string
  type: 'tvshow' | 'movie'
  basePlaylist: {
    id: string
    title: string
    isAnchor: boolean
    mediaTitleId: string
    submediaCount: number
  }
}
