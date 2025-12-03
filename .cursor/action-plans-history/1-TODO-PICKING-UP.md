# TODO: Picking Up Development

**Created:** 2025-10-22  
**Status:** Planning Phase  
**Estimated Time:** ~12 hours

---

## Current State Summary

### ✅ What's Working
- Domain entities: TVShowMedia, Playlist, MediaTitle (fully functional)
- All 55 tests passing
- Infrastructure setup: PostgresModule, MediaCatalogModule, Controllers scaffolded
- MediaDiscovery refactored with TypeScript interfaces
- Value objects: All implemented and tested

### 🚧 What's Incomplete
- TypeORM entities need proper types and relationships
- Repository layer not implemented
- API endpoints not created
- MediaDiscovery not integrated with persistence
- Stage module incomplete

---

## Phase 1: Complete TypeORM Entities
**Estimated Time:** ~2 hours  
**Priority:** HIGH - Foundation for all persistence

### Steps

#### 1.1 Fix TVShowMedia Entity
**File:** `src/modules/MediaCatalog/infra/entities/tv-show-media.entity.ts`

**Issues to fix:**
- Line 7: `id: number` should be `id: string` (UUID)
- Line 10: `name: string` should be `title: string`
- Line 28: `height: string` should be `height: number`
- Line 31: `width: string` should be `width: number`
- Remove duplicate `@PrimaryColumn` decorators - only one primary key allowed

**Action:**
```typescript
// Fix types
@PrimaryColumn('uuid')
id: string

@Column('varchar', { length: 150 })
title: string

@Column('varchar', { length: 150 })
fileName: string

@Column('varchar', { length: 100 })
folderName: string

@Column('varchar', { length: 10 })
fileExt: string

@Column('varchar', { length: 200 })
filePath: string

@Column('int')
duration: number

@Column('int')
height: number

@Column('int')
width: number

@Column('varchar', { length: 10 })
ratio: string
```

#### 1.2 Fix MediaTitle Entity
**File:** `src/modules/MediaCatalog/infra/entities/media-title.entity.ts`

**Issues to fix:**
- Line 7: `id: number` should be `id: string` (UUID)
- Line 10: Same issue - duplicate primary key
- Line 13: `path: string` - need to clarify if this is needed
- Line 16: `duration: number` - should be calculated from playlists
- Line 19: `mediaType: string` should be `type: 'tvshow' | 'movie'`

**Action:**
```typescript
@PrimaryColumn('uuid')
id: string

@Column('varchar', { length: 150 })
title: string

@Column('varchar', { length: 50 })
type: 'tvshow' | 'movie'

@Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
createdAt: Date

@Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
updatedAt: Date
```

#### 1.3 Create Playlist Entity
**File:** `src/modules/MediaCatalog/infra/entities/playlist.entity.ts` (NEW)

**Structure:**
```typescript
import { Entity, Column, PrimaryColumn, ManyToOne, OneToMany } from 'typeorm'
import { MediaTitle } from './media-title.entity'

@Entity()
export class Playlist {
  @PrimaryColumn('uuid')
  id: string

  @Column('varchar', { length: 150 })
  title: string

  @Column('boolean', { default: false })
  isAnchor: boolean

  @Column('uuid')
  mediaTitleId: string

  @ManyToOne(() => MediaTitle, mediaTitle => mediaTitle.playlists)
  mediaTitle: MediaTitle

  @Column('jsonb')
  submedia: any[] // Store TVShowMedia DTOs

  @Column('jsonb', { nullable: true })
  collections: any[] // Store ICollection[] 

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date
}
```

#### 1.4 Update MediaTitle Entity with Relationships
```typescript
@OneToMany(() => Playlist, playlist => playlist.mediaTitle)
playlists: Playlist[]
```

#### 1.5 Verify Entity Registration
- Check `postgres.module.ts` entity path configuration
- Ensure entities are auto-loaded
- Test database connection

**Testing:**
- Run app and verify no TypeORM errors
- Check database tables created

---

## Phase 2: Repository Layer Implementation
**Estimated Time:** ~3 hours  
**Priority:** HIGH - Enables data access

### Steps

#### 2.1 Create MediaTitleRepository
**File:** `src/modules/MediaCatalog/infra/repositories/MediaTitle.repository.ts` (NEW)

**Interface:**
```typescript
import { MediaTitle } from '#mediaCatalog/domain/entities/MediaTitle'
import { Playlist } from '#mediaCatalog/domain/entities/Playlist'

export interface IMediaTitleRepository {
  create(mediaTitle: MediaTitle): Promise<void>
  findById(id: string): Promise<MediaTitle | null>
  findAll(): Promise<MediaTitle[]>
  update(mediaTitle: MediaTitle): Promise<void>
  delete(id: string): Promise<void>
}
```

**Implementation:**
- Use TypeORM repository pattern
- Convert between domain entities and TypeORM entities
- Handle Playlist creation/update
- Use transactions for aggregate operations

#### 2.2 Create PlaylistRepository
**File:** `src/modules/MediaCatalog/infra/repositories/Playlist.repository.ts` (NEW)

**Interface:**
```typescript
import { Playlist } from '#mediaCatalog/domain/entities/Playlist'

export interface IPlaylistRepository {
  create(playlist: Playlist): Promise<void>
  findById(id: string): Promise<Playlist | null>
  findByMediaTitleId(mediaTitleId: string): Promise<Playlist[]>
  findAnchorByMediaTitleId(mediaTitleId: string): Promise<Playlist | null>
  update(playlist: Playlist): Promise<void>
  delete(id: string): Promise<void>
}
```

**Implementation:**
- Map between domain Playlist and TypeORM Playlist
- Handle Map serialization/deserialization for JSONB
- Support submedia ordering

#### 2.3 Create TVShowMediaRepository (Optional)
**File:** `src/modules/MediaCatalog/infra/repositories/TVShowMedia.repository.ts` (NEW)

**Note:** May not be needed if TVShowMedia is only stored within Playlists

**Decision Point:** Determine if TVShowMedia needs standalone persistence

#### 2.4 Register Repositories in MediaCatalogModule
**File:** `src/modules/MediaCatalog/MediaCatalog.module.ts`

**Action:**
```typescript
import { TypeOrmModule } from '@nestjs/typeorm'
import { MediaTitle } from './infra/entities/media-title.entity'
import { Playlist } from './infra/entities/playlist.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaTitle, Playlist])
  ],
  controllers: [MediaDiscoveryController],
  providers: [
    MediaTitleRepository,
    PlaylistRepository,
  ],
  exports: [MediaTitleRepository, PlaylistRepository],
})
export class MediaCatalogModule {}
```

#### 2.5 Create Repository Tests
- Test CRUD operations
- Test entity conversions
- Test error handling

**Testing:**
- Unit tests for each repository
- Integration tests with test database

---

## Phase 3: API Endpoints
**Estimated Time:** ~2 hours  
**Priority:** MEDIUM - User-facing functionality

### Steps

#### 3.1 Create MediaTitle Controller
**File:** `src/modules/MediaCatalog/infra/controllers/MediaTitle.controller.ts` (NEW)

**Endpoints:**
```typescript
@Controller('media-titles')
export class MediaTitleController {
  // GET /media-titles
  findAll(): Promise<MediaTitle[]>
  
  // GET /media-titles/:id
  findOne(@Param('id') id: string): Promise<MediaTitle>
  
  // POST /media-titles
  create(@Body() createDto: CreateMediaTitleDto): Promise<MediaTitle>
  
  // PATCH /media-titles/:id
  update(@Param('id') id: string, @Body() updateDto: UpdateMediaTitleDto)
  
  // DELETE /media-titles/:id
  remove(@Param('id') id: string)
}
```

#### 3.2 Create Playlist Controller
**File:** `src/modules/MediaCatalog/infra/controllers/Playlist.controller.ts` (NEW)

**Endpoints:**
```typescript
@Controller('playlists')
export class PlaylistController {
  // GET /playlists/:id
  findOne(@Param('id') id: string): Promise<Playlist>
  
  // GET /media-titles/:mediaTitleId/playlists
  findByMediaTitle(@Param('mediaTitleId') mediaTitleId: string)
  
  // POST /playlists
  create(@Body() createDto: CreatePlaylistDto): Promise<Playlist>
  
  // PATCH /playlists/:id/submedia
  updateSubmediaOrder(@Param('id') id: string, @Body() order: number[])
  
  // DELETE /playlists/:id
  remove(@Param('id') id: string)
}
```

#### 3.3 Create DTOs
**Files:** 
- `src/modules/MediaCatalog/infra/dtos/create-media-title.dto.ts`
- `src/modules/MediaCatalog/infra/dtos/create-playlist.dto.ts`
- `src/modules/MediaCatalog/infra/dtos/update-playlist.dto.ts`

**Use class-validator decorators:**
```typescript
export class CreateMediaTitleDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsEnum(['tvshow', 'movie'])
  type: 'tvshow' | 'movie'
}
```

#### 3.4 Add Global Error Handling
**File:** `src/common/filters/http-exception.filter.ts` (NEW)

- Catch domain errors
- Return proper HTTP status codes
- Format error responses

#### 3.5 Register Controllers in Module
**File:** `src/modules/MediaCatalog/MediaCatalog.module.ts`

**Testing:**
- Test all endpoints with Postman/curl
- Test error scenarios
- Test validation

---

## Phase 4: Media Discovery Integration
**Estimated Time:** ~2 hours  
**Priority:** MEDIUM - Connect discovery to persistence

### Steps

#### 4.1 Refactor MediaDiscovery to Use Repositories
**File:** `src/modules/MediaCatalog/infra/repositories/MediaDiscovery/MediaDiscovery.ts`

**Changes:**
- Remove file system operations
- Inject MediaTitleRepository and PlaylistRepository
- Convert discovered data to domain entities
- Save to database instead of JSON files

#### 4.2 Create MediaDiscovery Service
**File:** `src/modules/MediaCatalog/domain/services/MediaDiscovery.service.ts` (NEW)

**Purpose:** Orchestrate discovery and persistence

**Methods:**
```typescript
class MediaDiscoveryService {
  async discoverTitle(titlePath: string, titleInfo: IAvailableTitle): Promise<MediaTitle>
  async discoverAllTitles(): Promise<MediaTitle[]>
  async rebuildPlaylist(mediaTitleId: string): Promise<Playlist>
}
```

#### 4.3 Update MediaDiscovery Controller
**File:** `src/modules/MediaCatalog/infra/controllers/MediaDiscovery.controller.ts`

**Endpoints:**
```typescript
@Controller('discovery')
export class MediaDiscoveryController {
  // POST /discovery/scan
  scanTitles(): Promise<MediaTitle[]>
  
  // POST /discovery/rebuild/:mediaTitleId
  rebuildPlaylist(@Param('mediaTitleId') mediaTitleId: string): Promise<Playlist>
}
```

#### 4.4 Update Tests
- Update MediaDiscovery tests to use repositories
- Mock repository dependencies
- Test integration flow

**Testing:**
- End-to-end discovery flow
- Verify database persistence
- Test playlist rebuild

---

## Phase 5: Stage Module Completion
**Estimated Time:** ~3 hours  
**Priority:** LOW - Future feature

### Steps

#### 5.1 Complete Director Entity
**File:** `src/modules/Stage/domain/entities/Director/index.ts`

**Issues:**
- Line 61: Type error in create method
- Incomplete value object validation
- Missing media type handling

**Fix:**
- Correct type casting
- Complete validation
- Add proper domain methods

#### 5.2 Create Director Repository
**File:** `src/modules/Stage/infra/repositories/Director.repository.ts` (NEW)

#### 5.3 Create Stage Controller
**File:** `src/modules/Stage/infra/controllers/Stage.controller.ts` (NEW)

**Endpoints:**
```typescript
@Controller('stage')
export class StageController {
  // POST /stage/load-media
  loadMedia(@Body() mediaId: string): Promise<void>
  
  // POST /stage/play
  play(): Promise<void>
  
  // POST /stage/pause
  pause(): Promise<void>
  
  // POST /stage/stop
  stop(): Promise<void>
}
```

#### 5.4 Implement OBS Integration Service
**File:** `src/modules/Stage/domain/services/OBS.service.ts` (NEW)

**Methods:**
- Connect to OBS WebSocket
- Load media scenes
- Control playback
- Handle OBS events

#### 5.5 Create Stage Module
**File:** `src/modules/Stage/Stage.module.ts` (NEW)

**Testing:**
- Mock OBS WebSocket
- Test scene loading
- Test playback control

---

## Implementation Notes

### Database Considerations
- Use transactions for aggregate operations
- Consider soft delete pattern
- Plan for migration strategy
- Index optimization for queries

### Error Handling
- Use Result pattern consistently
- Handle validation errors gracefully
- Log errors appropriately
- Return meaningful error messages

### Testing Strategy
- Unit tests for all repositories
- Integration tests for controllers
- E2E tests for critical flows
- Mock external dependencies (OBS, file system)

### Code Quality
- Follow DDD principles
- Keep domain pure (no infrastructure imports)
- Use dependency injection
- Document complex logic

---

## Dependencies Between Phases

```
Phase 1 (TypeORM) → Phase 2 (Repositories)
Phase 2 (Repositories) → Phase 3 (API)
Phase 2 (Repositories) → Phase 4 (Discovery Integration)
Phase 1 (TypeORM) → Phase 5 (Stage Module)
```

**Recommendation:** Complete Phases 1-2 first, then proceed with Phases 3-4 in parallel, save Phase 5 for last.

---

## Success Criteria

- [ ] All TypeORM entities properly typed and tested
- [ ] Repositories implement CRUD operations
- [ ] API endpoints return proper responses
- [ ] MediaDiscovery persists to database
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Code follows DDD principles

---

## Notes

- Keep domain layer pure (no TypeORM imports)
- Use DTOs for data transfer
- Validate all inputs
- Handle edge cases (empty playlists, missing files, etc.)
- Consider performance for large catalogs
- Document API endpoints


