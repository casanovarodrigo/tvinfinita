/**
 * Script to clear all data from the database
 * Run with: npm run db:clear
 */

import { DataSource } from 'typeorm'
import { config } from 'dotenv'
import { MediaTitleEntity } from '#mediaCatalog/infra/entities/media-title.entity'
import { PlaylistEntity } from '#mediaCatalog/infra/entities/playlist.entity'
import { TVShowMediaEntity } from '#mediaCatalog/infra/entities/tv-show-media.entity'
import { PlaylistTVShowMediaJunctionEntity } from '#mediaCatalog/infra/entities/playlist-tvshow-media.entity'

// Load environment variables
config()

async function clearDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'tvinfinita',
    entities: [MediaTitleEntity, PlaylistEntity, TVShowMediaEntity, PlaylistTVShowMediaJunctionEntity],
  })

  try {
    await dataSource.initialize()
    console.log('✅ Connected to database')

    const queryRunner = dataSource.createQueryRunner()
    const tables = [
      'playlist_tvshow_media', // Junction table first (due to foreign keys)
      'playlist',
      'tv_show_media',
      'media_title',
    ]

    console.log('🗑️  Clearing database tables...')

    // Truncate tables in order (CASCADE handles foreign key constraints)
    for (const table of tables) {
      try {
        await queryRunner.query(`TRUNCATE TABLE "${table}" CASCADE`)
        console.log(`   ✓ Cleared table: ${table}`)
      } catch (error: any) {
        // Table might not exist yet, that's okay - check error code
        if (
          error.code === '42P01' ||
          error.message.includes('does not exist') ||
          error.message.includes('não existe')
        ) {
          console.log(`   ⚠ Table ${table} does not exist (skipping)`)
        } else {
          console.error(`   ✗ Error clearing ${table}:`, error.message)
          throw error
        }
      }
    }

    console.log('✅ Database cleared successfully!')
    await dataSource.destroy()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    process.exit(1)
  }
}

clearDatabase()
