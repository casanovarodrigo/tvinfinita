# Focused Implementation Plan: Legacy → DDD Migration

**Created:** 2025-10-22  
**Based on:** User priorities and requirements  
**Database:** PostgreSQL (migrating from Firestore)  
**Timeline:** Flexible, incremental development

---

## 🎯 Implementation Priority Order

Based on your requirements, here's the reordered plan:

### Phase 1: Media Discovery & Registration ✅
**Status:** Complete  
**Time:** 6 hours

### Phase 2: Media Scheduler (Simple Strategy Only) ✅
**Status:** Complete  
**Time:** 8 hours  
**⚠️ IMPORTANT:** Only implement simple strategy. Other strategies deferred.

### Phase 3: Director + DDD Architecture
**Status:** Not started  
**Time:** 22 hours

### Phase 4: OBS Repositories/Models
**Status:** Not started  
**Time:** 14 hours  
**Purpose:** Test OBS integration

### Phase 5: API System
**Status:** Not started  
**Time:** 10 hours  
**Purpose:** Test via HTTP endpoints

### Phase 6: Base Stages & Assistant
**Status:** Not started  
**Time:** 8 hours  
**Purpose:** Required by Director

### Phase 7: HUD (OBS Browser Source)
**Status:** Not started  
**Time:** 6 hours  
**Clarification:** HTML rendered as browser source in OBS, not frontend

### Phase 8: Poll System
**Status:** Not started  
**Time:** 8 hours

### Phase 9: Chat Integration (Last Priority)
**Status:** Not started  
**Time:** 22 hours  
**Note:** Should use same app functionality as API

---

## 📋 Detailed Phase Breakdown

### Phase 1: Media Discovery & Registration (6 hours)

#### 1.1 Complete MediaDiscovery (2 hours)
**Current:** `src/modules/MediaCatalog/infra/repositories/MediaDiscovery/MediaDiscovery.ts`

**What's done:**
- ✅ File scanning
- ✅ Metadata extraction
- ✅ Validation pipeline

**What's missing:**
- ❌ Save to PostgreSQL (currently saves to JSON)
- ❌ Integration with repositories

**Action:**
```typescript
// Update MediaDiscovery to use MediaTitleRepository
// Remove JSON file saving
// Save directly to database
```

#### 1.2 Media Registration Use Case (2 hours)
**Create:** `src/modules/MediaCatalog/application/use-cases/RegisterMedia.use-case.ts`

**Purpose:** Orchestrate discovery and persistence

**Flow:**
1. Scan available-titles.json
2. Discover media files
3. Extract metadata
4. Create domain entities (MediaTitle, Playlist, TVShowMedia)
5. Save to database

#### 1.3 Media Registration Controller (2 hours)
**Create:** `src/modules/MediaCatalog/infra/controllers/MediaRegistration.controller.ts`

**Endpoints:**
- `POST /api/media/register` - Register all titles
- `GET /api/media/titles` - List all registered titles
- `GET /api/media/titles/:id` - Get specific title

**Test:** Verify media is saved to PostgreSQL

---

### Phase 2: Media Scheduler (Simple Strategy Only) (8 hours)

#### 2.1 MediaScheduler Domain Service (4 hours) ✅
**Created:** `src/modules/MediaCatalog/domain/services/MediaScheduler.service.ts`

**Key Features:**
- ✅ Title catalog management
- ✅ Schedule generation
- ✅ Last scheduled tracking
- ✅ **ONLY Simple Strategy** (other strategies deferred)

**Methods Implemented:**
```typescript
export class MediaSchedulerService {
  static createSchedule(options: IScheduleOptions): Schedule ✅
  static peekNextFromSchedule(schedule: Schedule, itemCount: number): MediaQueue ✅
  static shiftSchedule(schedule: Schedule): ITVShowMediaDTO | undefined ✅
  static isScheduleToPlayEmpty(schedule: Schedule): boolean ✅
  static updateLastScheduled(schedule: Schedule, titleId: string, media: ITVShowMediaDTO): void ✅
  static getLastScheduled(schedule: Schedule, titleId: string): ITVShowMediaDTO | undefined ✅
}
```

#### 2.2 Simple Strategy (2 hours) ✅
**Created:** `src/modules/MediaCatalog/domain/services/strategies/SimpleStrategy.ts`

**Logic Implemented:**
- ✅ If only one title available, loop through all episodes
- ✅ Fill schedule until timespan is reached
- ✅ Track last scheduled episode
- ✅ Error handling for multiple titles (throws error)
- ✅ Handles empty playlists gracefully

**⚠️ REMEMBER:** Other strategies (MultipleCommon, MultipleWeighted) are deferred.

#### 2.3 Schedule Domain Entity (2 hours) ✅
**Created:** `src/modules/MediaCatalog/domain/entities/Schedule/index.ts`

**Properties:**
- ✅ id: DomainID
- ✅ preStart: MediaQueue (before schedule starts)
- ✅ toPlay: MediaQueue (currently playing)
- ✅ lastScheduledFromTitle: Map<string, ITVShowMediaDTO>
- ✅ unstarted: boolean

**Methods:**
- ✅ addToPreStart(), addToToPlay()
- ✅ shiftToPlay(), peekToPlay()
- ✅ isToPlayEmpty()
- ✅ updateLastScheduled(), getLastScheduled()
- ✅ markAsStarted()
- ✅ DTO getter

**Tests:** ✅ 35 tests total
- Schedule entity: 15 tests (100% coverage)
- SimpleStrategy: 6 tests (100% coverage)
- MediaScheduler service: 10 tests (100% coverage)
- Integration tests: 4 tests

---

### Phase 3: Director + DDD Architecture (22 hours)

#### 3.1 Stage Domain Entity (3 hours)
**Create:** `src/modules/Stage/domain/entities/Stage/index.ts`

**Properties:**
- stageNumber: number (1-4)
- status: 'available' | 'in_use' | 'on_screen'
- mediaQueue: TVShowMedia[]
- estimatedTimeToFinish: number
- lastUsed: Date
- combinedKey: string (title identifier)

#### 3.2 Stage Manager Domain Service (4 hours)
**Create:** `src/modules/Stage/domain/services/StageManager.service.ts`

**Port from:** Director's stage management methods

**Methods:**
- `getAvailableStage(): Stage`
- `setStageInUse(stage: Stage, mediaQueue: TVShowMedia[]): void`
- `vacateStage(stage: Stage): void`
- `addStageToQueue(stage: Stage): void`
- `popNextStageInQueue(): Stage`

#### 3.3 Media Formatter Domain Service (2 hours)
**Create:** `src/modules/Stage/domain/services/MediaFormatter.service.ts`

**Port from:** Director's `formatMediaForObs()`

**Purpose:** Convert domain entities to OBS format

**Method:**
```typescript
formatMediaForObs(media: TVShowMedia[], stageName: string): OBSMediaSource[]
```

#### 3.4 Director Use Cases (10 hours)
**Break Director into use cases:**

**3.4.1 PrepareStream Use Case (2 hours)**
```typescript
// src/modules/Stage/application/use-cases/PrepareStream.use-case.ts
export class PrepareStreamUseCase {
  async execute(): Promise<void> {
    // Stop existing cron jobs
    // Render base scenes
    // Initialize stages
  }
}
```

**3.4.2 RenderBaseScenes Use Case (2 hours)**
```typescript
// src/modules/Stage/application/use-cases/RenderBaseScenes.use-case.ts
export class RenderBaseScenesUseCase {
  async execute(): Promise<void> {
    // Set scene collection
    // Create base scenes (starting-stream, technical-break, offline)
    // Create stage scenes (stage_01, stage_02, etc.)
    // Create background images
    // Create chat overlays
  }
}
```

**3.4.3 RenderNextScheduledMedia Use Case (2 hours)**
```typescript
// src/modules/Stage/application/use-cases/RenderNextScheduledMedia.use-case.ts
export class RenderNextScheduledMediaUseCase {
  async execute(): Promise<void> {
    // Get available stage
    // Get next media from schedule
    // Create OBS sources
    // Set stage in use
    // Format and position media
  }
}
```

**3.4.4 StartSchedule Use Case (2 hours)**
```typescript
// src/modules/Stage/application/use-cases/StartSchedule.use-case.ts
export class StartScheduleUseCase {
  async execute(): Promise<void> {
    // Get next stage from queue
    // Get first media from schedule
    // Start media playback
    // Change to stage scene
    // Schedule next media cron job
  }
}
```

**3.4.5 NextMedia Use Case (2 hours)**
```typescript
// src/modules/Stage/application/use-cases/NextMedia.use-case.ts
export class NextMediaUseCase {
  async execute(): Promise<void> {
    // Stop current cron job
    // Add current to play history
    // Check if more media in stage
    // If yes: nextMediaInStage()
    // If no: check next stage or generate more schedule
  }
}
```

#### 3.5 Director Orchestration Service (3 hours)
**Create:** `src/modules/Stage/application/services/Director.service.ts`

**Purpose:** Coordinate use cases and manage state

**State Management:**
- Current schedule ID
- Stage metadata (available, in_use, queue, on_screen)
- Current media
- Play history

**Test:** Full director workflow

---

### Phase 4: OBS Repositories/Models (14 hours)

#### 4.1 OBS Service Layer (10 hours)

**4.1.1 Scene Service (2 hours)**
**Create:** `src/modules/Stage/infra/services/OBS/Scene.service.ts`

**Port from:** `../vcmanda/src/app/models/obs/scene.js`

**Methods:**
- `getScenes(): Promise<Scene[]>`
- `getScene(sceneName: string): Promise<Scene>`
- `createScene(sceneName: string): Promise<void>`
- `batchCreate(scenes: SceneConfig[]): Promise<void>`
- `setScene(sceneName: string): Promise<void>`

**4.1.2 SceneItems Service (2 hours)**
**Create:** `src/modules/Stage/infra/services/OBS/SceneItems.service.ts`

**Port from:** `../vcmanda/src/app/models/obs/sceneItems.js`

**Methods:**
- `getAll(sceneName: string): Promise<SceneItem[]>`
- `getProperties(sourceName: string, sceneName: string): Promise<SceneItemProperties>`
- `setProperties(sourceName: string, properties: SceneItemProperties, sceneName: string): Promise<void>`
- `removeItem(itemId: number, sourceName: string, sceneName: string): Promise<void>`

**4.1.3 Sources Service (2 hours)**
**Create:** `src/modules/Stage/infra/services/OBS/Sources.service.ts`

**Port from:** `../vcmanda/src/app/models/obs/sources.js`

**Methods:**
- `create(sourceName: string, sourceKind: string, sceneName: string, settings: SourceSettings): Promise<void>`
- `batchCreate(sources: SourceConfig[]): Promise<void>`
- `getSettings(sourceName: string): Promise<SourceSettings>`
- `getList(): Promise<Source[]>`

**4.1.4 MediaControl Service (2 hours)**
**Create:** `src/modules/Stage/infra/services/OBS/MediaControl.service.ts`

**Port from:** `../vcmanda/src/app/models/obs/mediaControl.js`

**Methods:**
- `play(sourceName: string): Promise<void>`
- `pause(sourceName: string): Promise<void>`
- `restart(sourceName: string): Promise<void>`
- `stop(sourceName: string): Promise<void>`
- `scrub(sourceName: string, time: number): Promise<void>`
- `getState(sourceName: string): Promise<MediaState>`

**4.1.5 SceneCollections Service (1 hour)**
**Create:** `src/modules/Stage/infra/services/OBS/SceneCollections.service.ts`

**Port from:** `../vcmanda/src/app/models/obs/sceneCollections.js`

**Methods:**
- `getList(): Promise<SceneCollection[]>`
- `setCurrent(collectionName: string): Promise<boolean>`

**4.1.6 Output Service (1 hour)**
**Create:** `src/modules/Stage/infra/services/OBS/Output.service.ts`

**Port from:** `../vcmanda/src/app/models/obs/output.js`

**Methods:**
- `getList(): Promise<Output[]>`

#### 4.2 OBS Priority Queue (4 hours)
**Create:** `src/modules/Stage/infra/services/OBS/OBSPriorityQueue.service.ts`

**Port from:** `../vcmanda/src/app/core/workers/obsPQ.js`

**Purpose:** Batch OBS commands to avoid overwhelming WebSocket

**Implementation:**
```typescript
export enum OBSMethodType {
  SHOW_MEDIA = 'SHOW_MEDIA',
  HIDE_MEDIA = 'HIDE_MEDIA',
  CHANGE_STAGE_FOCUS = 'CHANGE_STAGE_FOCUS',
  CHANGE_MEDIA_PROPERTIES = 'CHANGE_MEDIA_PROPERTIES',
  CREATE_SOURCE = 'CREATE_SOURCE',
  VACATE_STAGE = 'VACATE_STAGE',
  // ... etc
}

export class OBSPriorityQueue {
  private queues: Map<OBSMethodType, Queue<OBSCommand>>
  
  pushToQueue(methodType: OBSMethodType, command: () => Promise<void>): void
  async processQueue(): Promise<void>
}
```

**Test:** Verify OBS commands are batched correctly

---

### Phase 5: API System (10 hours)

#### 5.1 Media Registration Controller (2 hours)
**Create:** `src/modules/MediaCatalog/infra/controllers/MediaRegistration.controller.ts`

**Endpoints:**
- `POST /api/media/register` - Register all titles
- `GET /api/media/titles` - List all titles
- `GET /api/media/titles/:id` - Get title details
- `GET /api/media/titles/:id/playlists` - Get playlists

#### 5.2 Schedule Controller (2 hours)
**Create:** `src/modules/MediaCatalog/infra/controllers/Schedule.controller.ts`

**Endpoints:**
- `POST /api/schedule/create` - Create new schedule
- `GET /api/schedule/:id` - Get schedule
- `GET /api/schedule/:id/next` - Peek next media

#### 5.3 Director Controller (3 hours)
**Create:** `src/modules/Stage/infra/controllers/Director.controller.ts`

**Endpoints:**
- `POST /api/director/prepare` - Prepare stream
- `POST /api/director/start` - Start schedule
- `POST /api/director/stop` - Stop schedule
- `GET /api/director/status` - Get current status
- `GET /api/director/stages` - Get stage info
- `GET /api/director/history` - Get play history

#### 5.4 OBS Controller (3 hours)
**Create:** `src/modules/Stage/infra/controllers/OBS.controller.ts`

**Endpoints:**
- `GET /api/obs/scenes` - List scenes
- `GET /api/obs/scenes/:name` - Get scene
- `POST /api/obs/scenes/:name/set` - Set current scene
- `GET /api/obs/sources` - List sources
- `POST /api/obs/media/:sourceName/play` - Play media
- `POST /api/obs/media/:sourceName/pause` - Pause media
- `GET /api/obs/media/:sourceName/state` - Get media state

**Test:** All endpoints via Postman/curl

---

### Phase 6: Base Stages & Assistant (8 hours)

#### 6.1 Base Stages Value Object (2 hours)
**Create:** `src/modules/Stage/domain/value-objects/BaseStages.value-object.ts`

**Port from:** `../vcmanda/src/app/core/props/baseStages.js`

**Properties:**
```typescript
export class BaseStagesValueObject {
  static readonly STARTING_STREAM = 'starting-stream'
  static readonly TECHNICAL_BREAK = 'technical-break'
  static readonly OFFLINE = 'offline-stream'
  static readonly HUD_SCENE = 'hud'
  static readonly MAX_STAGES = 4
  static readonly MAX_MEDIA_PER_STAGE = 4
  
  static getBaseStages(): BaseStageConfig[]
  static getStageName(stageNumber: number): string
}
```

#### 6.2 Assistant Service (6 hours)
**Create:** `src/modules/Stage/infra/services/Assistant.service.ts`

**Port from:** `../vcmanda/src/app/core/workers/assistant.js`

**Features:**
- HUD source rendering
- Media timespan rendering
- Scene item management

**Methods:**
- `renderHudSource(): Promise<void>`
- `addHudToScene(sceneName: string): Promise<void>`
- `setBaseHud(): Promise<void>`
- `getMediaHud(): MediaHUD`

**Test:** Verify HUD appears in OBS

---

### Phase 7: HUD (OBS Browser Source) (6 hours)

#### 7.1 HUD Service (4 hours)
**Create:** `src/modules/Stage/infra/services/HUD.service.ts`

**Port from:** `../vcmanda/src/app/core/media/mediaHUD.js`

**Clarification:** HUD is HTML rendered as browser source in OBS, not a separate frontend.

**Features:**
- Grid-based layout system
- Media timer display
- Top voted media display
- Socket.io communication

**Methods:**
- `renderBaseHUD(templateOrientation: string, payload: HUDData): Promise<void>`
- `addToGrid(items: HUDItem[]): void`
- `renderMediaTimespan(visible: boolean): Promise<void>`

#### 7.2 Socket.io Integration (2 hours)
**Create:** `src/modules/Stage/infra/services/SocketIO.service.ts`

**Port from:** `../vcmanda/src/app/core/twitch/twitchOverlaySocket.js`

**Purpose:** Real-time communication with OBS browser source

**Methods:**
- `emit(event: string, data: any): void`
- `on(event: string, callback: Function): void`

**Test:** Verify HUD updates in real-time in OBS

---

### Phase 8: Poll System (8 hours)

#### 8.1 Poll Domain Entity (2 hours)
**Create:** `src/modules/Chat/domain/entities/Poll.entity.ts`

**Properties:**
- id: DomainID
- name: string
- votes: Map<string, string[]> (username -> preferences)
- startedAt: Date

#### 8.2 Poll Domain Service (3 hours)
**Create:** `src/modules/Chat/domain/services/Poll.service.ts`

**Port from:** `../vcmanda/src/app/core/workers/poll.js`

**Methods:**
- `appendVote(pollName: string, user: string, preferences: string[]): Promise<void>`
- `calculateResults(pollName: string): Promise<Ranking[]>`
- `validateTitles(preferences: string[]): string[]` (string similarity)

#### 8.3 Poll Repository (2 hours)
**Create:** `src/modules/Chat/infra/repositories/Poll.repository.ts`

**Purpose:** Persist polls to PostgreSQL

#### 8.4 Poll Application Service (1 hour)
**Create:** `src/modules/Chat/application/services/Poll.service.ts`

**Purpose:** Orchestrate poll operations with cron jobs

**Test:** Create poll, vote, calculate results

---

### Phase 9: Chat Integration (Last Priority) (22 hours)

#### 9.1 Modern Twitch Integration (8 hours)
**Replace deprecated libraries:**

**Install:**
```bash
npm install @twurple/api @twurple/auth @twurple/chat
```

**Create:** `src/modules/Chat/infra/providers/Twitch.provider.ts`

**Port from:** `../vcmanda/src/app/core/twitch/chat.js`

**Methods:**
- `connect(): Promise<void>`
- `onMessage(callback: (message: ChatMessage) => void): void`
- `sendMessage(channel: string, message: string): Promise<void>`

#### 9.2 Command Handler (6 hours)
**Create:** `src/modules/Chat/application/services/CommandHandler.service.ts`

**Commands:**
- `!ping` → Response
- `!pref title1, title2` → Media preference voting
- `!play` → Play media (mod only)
- `!pause` → Pause media (mod only)
- `!skip` → Skip to next (mod only)
- `!list` → List available titles

**Important:** Commands should call same use cases as API endpoints

#### 9.3 Chat Module (4 hours)
**Create:** `src/modules/Chat/Chat.module.ts`

**Wire everything together**

#### 9.4 Chat Service (4 hours)
**Create:** `src/modules/Chat/infra/services/Chat.service.ts`

**Purpose:** Start chat connection and route commands

**Test:** Commands work same as API endpoints

---

## 🗄️ Database Migration: Firestore → PostgreSQL

### Migration Strategy

**Current Legacy:** Uses Firestore for:
- Last scheduled media per title
- Schedule persistence

**New System:** Use PostgreSQL with TypeORM

#### Tables Needed:

1. **media_titles**
   - id (UUID)
   - title (VARCHAR)
   - type (VARCHAR: 'tvshow' | 'movie')
   - created_at, updated_at

2. **playlists**
   - id (UUID)
   - title (VARCHAR)
   - is_anchor (BOOLEAN)
   - media_title_id (UUID FK)
   - submedia (JSONB) - Array of TVShowMedia DTOs
   - collections (JSONB) - Optional
   - created_at, updated_at

3. **tv_show_media**
   - id (UUID)
   - title (VARCHAR)
   - file_name (VARCHAR)
   - file_path (VARCHAR)
   - folder_name (VARCHAR)
   - file_ext (VARCHAR)
   - duration (INT)
   - width (INT)
   - height (INT)
   - ratio (VARCHAR)
   - created_at, updated_at

4. **schedules**
   - id (UUID)
   - unstarted (BOOLEAN)
   - pre_start_queue (JSONB)
   - to_play_queue (JSONB)
   - last_scheduled (JSONB) - Map of title -> last media
   - created_at, updated_at

5. **polls**
   - id (UUID)
   - name (VARCHAR)
   - votes (JSONB) - Map of user -> preferences
   - started_at (TIMESTAMP)
   - created_at, updated_at

---

## 🧪 Testing Strategy

**Approach:** Ask about tests as we implement features

**General Guidelines:**
- Test critical business logic
- Test integration points (OBS, Database)
- Skip testing simple getters/setters
- Focus on use cases and domain services

**When to ask:**
- After each phase completion
- Before implementing complex logic
- When integration points are added

---

## 📝 Implementation Checklist

### Phase 1: Media Discovery & Registration
- [ ] Complete MediaDiscovery with PostgreSQL
- [ ] Create RegisterMedia use case
- [ ] Create MediaRegistration controller
- [ ] Test: Register titles and verify in DB

### Phase 2: Media Scheduler (Simple Strategy Only) ✅
- [x] Create MediaScheduler domain service
- [x] Create SimpleStrategy (ONLY - defer others)
- [x] Create Schedule entity
- [x] Test: Generate schedule with single title
- [x] Integration tests with MediaTitle entities

### Phase 3: Director + DDD Architecture
- [ ] Create Stage entity
- [ ] Create StageManager service
- [ ] Create MediaFormatter service
- [ ] Create Director use cases
- [ ] Create Director orchestration service
- [ ] Test: Full director workflow

### Phase 4: OBS Repositories/Models
- [ ] Create all OBS services
- [ ] Create OBS Priority Queue
- [ ] Test: Verify OBS commands work

### Phase 5: API System
- [ ] Create all controllers
- [ ] Create DTOs
- [ ] Test: All endpoints via Postman

### Phase 6: Base Stages & Assistant
- [ ] Create BaseStages value object
- [ ] Create Assistant service
- [ ] Test: Verify base scenes created in OBS

### Phase 7: HUD
- [ ] Create HUD service
- [ ] Create Socket.io service
- [ ] Test: Verify HUD displays in OBS browser source

### Phase 8: Poll System
- [ ] Create Poll entity
- [ ] Create Poll services
- [ ] Create Poll repository
- [ ] Test: Create poll, vote, get results

### Phase 9: Chat Integration
- [ ] Replace Twitch libraries
- [ ] Create command handler
- [ ] Create chat service
- [ ] Test: Commands work same as API

---

## 🎯 Key Reminders

1. **Database:** PostgreSQL (migrate from Firestore)
2. **Scheduler:** Only Simple Strategy for now (defer others)
3. **HUD:** OBS browser source (HTML), not frontend
4. **Chat:** Last priority, but should use same functionality as API
5. **Testing:** Ask as we go, don't over-test
6. **Timeline:** Flexible, no rush

---

## 🚀 Ready to Start

**Next Step:** Begin with Phase 1 - Complete Media Discovery & Registration

**Estimated Total Time:** ~92 hours (excluding chat)

**When ready, say "ACT" and we'll start with Phase 1!** 🎬

