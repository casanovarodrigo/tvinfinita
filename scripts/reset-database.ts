/**
 * Script to drop and recreate all database tables
 * This will reset the schema to match the current entity definitions
 * Run with: npm run db:reset
 */

import { DataSource } from 'typeorm'
import { config } from 'dotenv'
import { MediaTitleEntity } from '#mediaCatalog/infra/entities/media-title.entity'
import { PlaylistEntity } from '#mediaCatalog/infra/entities/playlist.entity'
import { TVShowMediaEntity } from '#mediaCatalog/infra/entities/tv-show-media.entity'
import { PlaylistTVShowMediaJunctionEntity } from '#mediaCatalog/infra/entities/playlist-tvshow-media.entity'

// Load environment variables
config()

async function resetDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'tvinfinita',
    entities: [MediaTitleEntity, PlaylistEntity, TVShowMediaEntity, PlaylistTVShowMediaJunctionEntity],
    synchronize: false, // We'll handle this manually
  })

  try {
    await dataSource.initialize()
    console.log('✅ Connected to database')

    const queryRunner = dataSource.createQueryRunner()

    // Drop tables in reverse order of dependencies
    const tables = [
      'playlist_tvshow_media', // Junction table (depends on playlist and tv_show_media)
      'playlist', // Depends on media_title
      'tv_show_media', // Independent
      'media_title', // Independent (but playlist depends on it)
    ]

    console.log('🗑️  Dropping existing tables...')

    for (const table of tables) {
      try {
        await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`)
        console.log(`   ✓ Dropped table: ${table}`)
      } catch (error: any) {
        console.error(`   ✗ Error dropping ${table}:`, error.message)
      }
    }

    console.log('✅ All tables dropped successfully!')
    console.log('📝 Restart your server to recreate tables with new schema')
    console.log('   (TypeORM synchronize will create the new structure)')

    await dataSource.destroy()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    process.exit(1)
  }
}

resetDatabase()
