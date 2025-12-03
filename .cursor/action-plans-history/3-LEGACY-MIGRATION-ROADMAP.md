# Legacy JavaScript MVP → DDD TypeScript Migration Roadmap

**Created:** 2025-10-22  
**Source:** `../vcmanda` (Legacy JavaScript MVP)  
**Target:** `tvinfinita` (DDD TypeScript)  
**Goal:** Port all working features from legacy to new architecture

---

## 📊 Legacy Project Analysis

### Architecture Overview

**Legacy Structure (MVC):**
```
vcmanda/
  src/app/
    controllers/        # Express route handlers
    core/              # Business logic
      workers/         # Director, Poll, Assistant
      media/           # Scheduler, HUD, Strategies
      twitch/          # Chat, Overlay Socket
      props/           # Base stages config
    models/            # Data access (Firestore, Local, OBS)
    helpers/           # Utilities
```

**Key Libraries Used:**
- `twitch` (v4.5.4) - ⚠️ **DEPRECATED** - Use `@twurple/api` instead
- `twitch-auth` (v4.5.4) - ⚠️ **DEPRECATED** - Use `@twurple/auth` instead  
- `twitch-chat-client` (v4.5.4) - ⚠️ **DEPRECATED** - Use `@twurple/chat` instead
- `obs-websocket-js` (v4.0.2) - ✅ Still maintained (current: v5.x)
- `fluent-ffmpeg` (v2.1.2) - ✅ Still maintained
- `@google-cloud/firestore` (v4.9.7) - ✅ Still maintained
- `votes` (v1.8.4) - ✅ Still maintained
- `socket.io` (v4.1.3) - ✅ Still maintained

### Feature Inventory

#### ✅ Core Features Found

1. **Media Discovery & Registration**
   - Scans `available-titles.json`
   - Validates media files
   - Extracts metadata (ffmpeg)
   - Saves to `validated/at.json`
   - Saves to Firestore DB

2. **Media Scheduling System**
   - Multiple scheduling strategies:
     - Single title strategy
     - Multiple common strategy
     - Multiple weighted strategy (with votes)
   - Schedule generation based on timespan
   - Tracks last scheduled episode per title
   - Pre-start and to-play queues

3. **OBS Director (Core Orchestrator)**
   - Manages multiple stages (4 stages max)
   - Scene collection management
   - Base scenes creation (starting-stream, technical-break, offline)
   - Media source creation and management
   - Stage queue system
   - Media playback coordination
   - HUD overlay management
   - Cron job scheduling for media transitions

4. **OBS Integration**
   - Scene management
   - Source creation/removal
   - Scene item properties (position, visibility, bounds)
   - Media control (play, pause, restart, scrub)
   - Output management
   - Scene collections
   - OBS Priority Queue (OBSPQ) for command batching

5. **Twitch Chat Integration**
   - Chat client connection
   - Command handling (`!ping`, `!pref`)
   - Media preference voting (`!pref title1, title2`)
   - String similarity matching for titles
   - Vote aggregation

6. **Polling System**
   - Media preference polls
   - Vote collection and storage
   - Kemeny voting system
   - Cron job for vote processing
   - File-based storage (`storage/polls/`)

7. **HUD (Heads-Up Display)**
   - Media timer display
   - Top voted media display
   - Socket.io overlay communication
   - Grid-based layout system
   - Template orientation support

8. **Assistant Worker**
   - HUD source rendering
   - Media timespan rendering
   - Scene item management

---

## 🗺️ Feature Mapping: Legacy → DDD Architecture

### Mapping Table

| Legacy Component | Legacy Location | DDD Target Location | Status |
|-----------------|----------------|---------------------|--------|
| **Media Discovery** | `models/localRepositoryModel.js` | `MediaCatalog/infra/repositories/MediaDiscovery/` | ✅ Partially done |
| **Media Registration** | `controllers/MediaRepositoryController.js` | `MediaCatalog/application/use-cases/` | ❌ Missing |
| **Media Scheduler** | `core/media/mediaScheduler.js` | `MediaCatalog/domain/services/` | ❌ Missing |
| **Scheduling Strategies** | `core/media/strategies/` | `MediaCatalog/domain/services/strategies/` | ❌ Missing |
| **Director** | `core/workers/director.js` | `Stage/application/use-cases/` | ❌ Missing |
| **OBS Models** | `models/obs/` | `Stage/infra/services/OBS/` | ❌ Missing |
| **OBS Priority Queue** | `core/workers/obsPQ.js` | `Stage/infra/services/OBS/` | ❌ Missing |
| **Twitch Chat** | `core/twitch/chat.js` | `Chat/infra/providers/Twitch.provider.ts` | ❌ Missing |
| **Poll System** | `core/workers/poll.js` | `Chat/domain/services/Poll.service.ts` | ❌ Missing |
| **HUD** | `core/media/mediaHUD.js` | `Stage/infra/services/HUD.service.ts` | ❌ Missing |
| **Assistant** | `core/workers/assistant.js` | `Stage/infra/services/Assistant.service.ts` | ❌ Missing |
| **Base Stages** | `core/props/baseStages.js` | `Stage/domain/value-objects/` | ❌ Missing |

---

## 📋 Migration Roadmap

### Phase 1: Foundation & Data Layer (Week 1-2)
**Goal:** Get data persistence working

#### 1.1 Complete Media Discovery (4 hours)
**Current:** Partially implemented in `MediaDiscovery.ts`

**What to port:**
- File scanning logic ✅ (already done)
- Metadata extraction ✅ (already done)
- Validation pipeline ✅ (already done)
- **Missing:** Firestore integration

**Action:**
```typescript
// src/modules/MediaCatalog/infra/repositories/Firestore.repository.ts
// Port from: models/firestoreModel.js
```

#### 1.2 Media Scheduler Domain Service (8 hours)
**Port from:** `core/media/mediaScheduler.js`

**Key Features:**
- Title catalog map management
- Schedule generation (pre-start, to-play)
- Last scheduled tracking
- Strategy selection

**DDD Location:**
```
src/modules/MediaCatalog/
  domain/
    services/
      MediaScheduler.service.ts
      strategies/
        SingleStrategy.ts
        MultipleCommonStrategy.ts
        MultipleWeightedStrategy.ts
```

**Key Methods to Port:**
- `validateAvailableTitles()` → Load from DB instead of file
- `createSchedule()` → Use domain entities
- `generateSchedule()` → Strategy pattern
- `peekNextFromSchedule()` → Domain query
- `shiftSchedule()` → Domain operation

#### 1.3 Scheduling Strategies (6 hours)
**Port from:** `core/media/strategies/`

**Strategies:**
1. **SingleStrategy** - Loop single title
2. **MultipleCommonStrategy** - Round-robin multiple titles
3. **MultipleWeightedStrategy** - Weighted by votes

**Implementation:**
```typescript
// src/modules/MediaCatalog/domain/services/strategies/ISchedulingStrategy.ts
export interface ISchedulingStrategy {
  generateSchedule(
    options: ScheduleOptions,
    titleCatalog: Map<string, MediaTitle>,
    lastScheduled: Map<string, TVShowMedia>
  ): Promise<Schedule>
}

// Implement each strategy
export class SingleStrategy implements ISchedulingStrategy { ... }
export class MultipleCommonStrategy implements ISchedulingStrategy { ... }
export class MultipleWeightedStrategy implements ISchedulingStrategy { ... }
```

---

### Phase 2: OBS Integration (Week 2-3)
**Goal:** Full OBS control like legacy

#### 2.1 OBS Service Layer (8 hours)
**Port from:** `models/obs/`

**Services to create:**
```
src/modules/Stage/infra/services/OBS/
  Scene.service.ts          # From models/obs/scene.js
  SceneItems.service.ts     # From models/obs/sceneItems.js
  Sources.service.ts        # From models/obs/sources.js
  MediaControl.service.ts   # From models/obs/mediaControl.js
  SceneCollections.service.ts
  Output.service.ts
```

**Key Methods:**
- Scene: create, get, set, batchCreate
- SceneItems: get, setProperties, removeItem, getAll
- Sources: create, batchCreate, getSettings, getList
- MediaControl: play, pause, restart, scrub, getState

#### 2.2 OBS Priority Queue (4 hours)
**Port from:** `core/workers/obsPQ.js`

**Purpose:** Batch OBS commands to avoid overwhelming WebSocket

**Implementation:**
```typescript
// src/modules/Stage/infra/services/OBS/OBSPriorityQueue.service.ts
export class OBSPriorityQueue {
  private queues: Map<Priority, Queue<OBSCommand>>
  
  pushToQueue(priority: Priority, command: OBSCommand): void
  async processQueue(): Promise<void>
}
```

#### 2.3 Base Stages Configuration (2 hours)
**Port from:** `core/props/baseStages.js`

**DDD Location:**
```typescript
// src/modules/Stage/domain/value-objects/BaseStages.value-object.ts
export class BaseStagesValueObject extends ValueObject {
  static readonly STARTING_STREAM = 'starting-stream'
  static readonly TECHNICAL_BREAK = 'technical-break'
  static readonly OFFLINE = 'offline-stream'
  static readonly MAX_STAGES = 4
  static readonly MAX_MEDIA_PER_STAGE = 4
  
  static getBaseStages(): BaseStage[]
}
```

---

### Phase 3: Director (Core Orchestrator) (Week 3-4)
**Goal:** Port the Director class - the heart of the system

#### 3.1 Director Use Cases (12 hours)
**Port from:** `core/workers/director.js` (880 lines!)

**Break into use cases:**
```
src/modules/Stage/application/use-cases/
  PrepareStream.use-case.ts
  RenderBaseScenes.use-case.ts
  RenderNextScheduledMedia.use-case.ts
  StartSchedule.use-case.ts
  NextMedia.use-case.ts
  NextStage.use-case.ts
  VacateStage.use-case.ts
```

**Key Domain Logic:**
- Stage metadata management (available, in_use, queue)
- Media formatting for OBS
- Stage coordination
- Schedule integration
- Cron job management

#### 3.2 Stage Domain Entity (4 hours)
**Create:** `src/modules/Stage/domain/entities/Stage.entity.ts`

**Properties:**
- Stage number
- Media queue
- Status (available, in_use, on_screen)
- Estimated time to finish
- Last used timestamp

#### 3.3 Director Domain Service (6 hours)
**Port business logic from Director class**

**Location:**
```
src/modules/Stage/domain/services/
  Director.service.ts
  StageManager.service.ts
  MediaFormatter.service.ts
```

**Key Methods:**
- `formatMediaForObs()` → Domain service
- `formatStageName()` → Value object
- Stage queue management
- Media-to-stage assignment logic

---

### Phase 4: Chat Integration (Week 4-5)
**Goal:** Replace deprecated Twitch libraries

#### 4.1 Modern Twitch Integration (8 hours)
**Replace:** `twitch`, `twitch-auth`, `twitch-chat-client`  
**With:** `@twurple/api`, `@twurple/auth`, `@twurple/chat`

**Install:**
```bash
npm install @twurple/api @twurple/auth @twurple/chat
```

**Implementation:**
```typescript
// src/modules/Chat/infra/providers/Twitch.provider.ts
import { ApiClient } from '@twurple/api'
import { StaticAuthProvider } from '@twurple/auth'
import { ChatClient } from '@twurple/chat'

export class TwitchProvider implements IChatProvider {
  private apiClient: ApiClient
  private chatClient: ChatClient
  
  async connect(): Promise<void> { ... }
  onMessage(callback: (message: ChatMessage) => void): void { ... }
  async sendMessage(channel: string, message: string): Promise<void> { ... }
}
```

#### 4.2 Command Handler (6 hours)
**Port from:** `core/twitch/chat.js`

**Commands to implement:**
- `!ping` → Simple response
- `!pref title1, title2` → Media preference voting
- `!play` → Play media (if mod)
- `!pause` → Pause media (if mod)
- `!skip` → Skip to next (if mod)
- `!list` → List available titles

**Location:**
```
src/modules/Chat/application/services/
  CommandHandler.service.ts
  CommandParser.service.ts
```

#### 4.3 Poll System (8 hours)
**Port from:** `core/workers/poll.js`

**Features:**
- Vote collection
- String similarity matching
- Kemeny voting algorithm
- File-based storage (or DB)
- Cron job processing

**DDD Location:**
```
src/modules/Chat/
  domain/
    services/
      Poll.service.ts
      Voting.service.ts
    entities/
      Poll.entity.ts
      Vote.entity.ts
  infra/
    repositories/
      Poll.repository.ts
```

**Key Methods:**
- `appendPollVote()` → Domain service
- `mediaPreferenceVote()` → Domain service
- `preferencePollChecker()` → Application service (cron)

---

### Phase 5: HUD & Assistant (Week 5)
**Goal:** Overlay display system

#### 5.1 HUD Service (6 hours)
**Port from:** `core/media/mediaHUD.js`

**Features:**
- Grid-based layout
- Media timer display
- Top voted display
- Socket.io communication

**Location:**
```
src/modules/Stage/infra/services/
  HUD.service.ts
  SocketIO.service.ts
```

#### 5.2 Assistant Service (4 hours)
**Port from:** `core/workers/assistant.js`

**Features:**
- HUD source rendering
- Media timespan rendering
- Scene item management

---

### Phase 6: API Endpoints (Week 5-6)
**Goal:** Port all Express routes to NestJS controllers

#### 6.1 Media Repository Controller (4 hours)
**Port from:** `controllers/MediaRepositoryController.js`

**Endpoints:**
- `GET /media/listavailabletitles`
- `GET /media/listalltitlessubrepos`
- `GET /media/listmediafromtitle`
- `GET /media/registertitles`
- `GET /media/savesavailabletitlestodb`
- `GET /media/generatecontent`

#### 6.2 OBS Controller (4 hours)
**Port from:** `controllers/ObsController.js`

**Endpoints:**
- `GET /obs/preparestages`
- `GET /obs/createschedule`
- `GET /obs/initschedule`
- `GET /obs/startschedule`
- `GET /obs/stopschedule`
- `GET /obs/nextscheduledmedia`
- `GET /obs/showordered`

#### 6.3 Director Controller (2 hours)
**Port from:** `controllers/DirectorController.js`

**Endpoints:**
- `GET /director/prepareeverything`
- `GET /director/prepareautostart`
- `GET /obs/inusestages`
- `GET /obs/playhistory`
- `GET /obs/currenthud`

#### 6.4 API Controller (4 hours)
**Port from:** `controllers/ApiController.js`

**OBS Media Control:**
- `GET /obs/pauseplay`
- `GET /obs/restartmedia`
- `GET /obs/stopmedia`
- `GET /obs/nextmedia`
- `GET /obs/previousmedia`
- `GET /obs/mediaduration`
- `GET /obs/mediatime`
- `GET /obs/setmediatime`
- `GET /obs/mediastate`
- `GET /obs/scrubmedia`

**OBS Scene Management:**
- `GET /obs/listscenecollections`
- `GET /obs/currentscenecollection`
- `GET /obs/setcurrentscenecollection`
- `GET /obs/listsceneitems`
- `POST /obs/sceneitemproperties`
- `POST /obs/setsceneitemproperties`

**OBS Sources:**
- `GET /obs/mediasourceslist`
- `GET /obs/sourcesettings`
- `GET /obs/sourceslist`
- `GET /obs/sourcestypes`
- `GET /obs/sourcestypebyname`
- `GET /obs/sourcestypebytypeid`

**OBS Output:**
- `GET /obs/outputlist`

---

## 🔄 Migration Strategy

### Approach: Incremental Porting

**Step 1:** Port data layer first
- Media discovery ✅ (mostly done)
- Firestore repository
- Media scheduler

**Step 2:** Port OBS integration
- OBS services
- Priority queue
- Base stages

**Step 3:** Port Director
- Break into use cases
- Domain services
- Stage entity

**Step 4:** Port Chat
- Modern Twitch libraries
- Command handler
- Poll system

**Step 5:** Port HUD & Assistant
- HUD service
- Socket.io
- Assistant service

**Step 6:** Port API endpoints
- Controllers
- DTOs
- Error handling

---

## 📦 Library Replacements

### Deprecated → Modern

| Legacy | Version | Replacement | Version | Notes |
|--------|---------|-------------|---------|-------|
| `twitch` | 4.5.4 | `@twurple/api` | Latest | Official Twitch library |
| `twitch-auth` | 4.5.4 | `@twurple/auth` | Latest | Auth provider |
| `twitch-chat-client` | 4.5.4 | `@twurple/chat` | Latest | Chat client |
| `obs-websocket-js` | 4.0.2 | `obs-websocket-js` | 5.x | Update to v5 |

### Still Good (Keep)

- `fluent-ffmpeg` - Video metadata
- `@google-cloud/firestore` - Database (or switch to PostgreSQL)
- `votes` - Voting algorithms
- `socket.io` - Real-time communication
- `string-similarity` - Title matching
- `cron` - Scheduled jobs

---

## 🎯 Priority Order

### Must Have (MVP)
1. ✅ Media Discovery (mostly done)
2. ⚠️ Media Scheduler (core feature)
3. ⚠️ Director (core orchestrator)
4. ⚠️ OBS Services (basic control)
5. ⚠️ Twitch Chat (basic commands)

### Should Have
6. Poll System
7. HUD/Assistant
8. Advanced OBS features
9. All API endpoints

### Nice to Have
10. YouTube/Kick chat
11. Advanced scheduling strategies
12. Analytics

---

## 📝 Implementation Checklist

### Phase 1: Foundation
- [ ] Complete MediaDiscovery with Firestore
- [ ] Create MediaScheduler domain service
- [ ] Port scheduling strategies
- [ ] Create Schedule domain entity

### Phase 2: OBS
- [ ] Create OBS service layer
- [ ] Port OBS Priority Queue
- [ ] Create base stages value object
- [ ] Test OBS connection

### Phase 3: Director
- [ ] Break Director into use cases
- [ ] Create Stage domain entity
- [ ] Port stage management logic
- [ ] Port media formatting
- [ ] Port schedule integration

### Phase 4: Chat
- [ ] Replace Twitch libraries
- [ ] Create Twitch provider
- [ ] Port command handler
- [ ] Port poll system
- [ ] Test chat commands

### Phase 5: HUD
- [ ] Port HUD service
- [ ] Port Socket.io integration
- [ ] Port Assistant service
- [ ] Test overlay display

### Phase 6: API
- [ ] Port all controllers
- [ ] Create DTOs
- [ ] Add error handling
- [ ] Test all endpoints

---

## 🚨 Critical Differences to Address

### 1. Database Choice
**Legacy:** Firestore  
**New:** PostgreSQL (TypeORM)

**Decision:** 
- Option A: Keep Firestore (easier migration)
- Option B: Migrate to PostgreSQL (better for DDD)
- **Recommendation:** Start with Firestore, migrate later

### 2. File System vs Database
**Legacy:** Mix of files and Firestore  
**New:** Should be all database

**Action:** Port file-based storage to repositories

### 3. Cron Jobs
**Legacy:** `cron` package  
**New:** NestJS `@nestjs/schedule` or keep `cron`

**Recommendation:** Use `@nestjs/schedule` for better integration

### 4. Singleton Pattern
**Legacy:** Many singletons (director, poll, etc.)  
**New:** Use NestJS dependency injection

**Action:** Convert to services with DI

---

## 📊 Estimated Effort

| Phase | Hours | Priority |
|-------|-------|----------|
| Phase 1: Foundation | 18h | HIGH |
| Phase 2: OBS | 14h | HIGH |
| Phase 3: Director | 22h | HIGH |
| Phase 4: Chat | 22h | HIGH |
| Phase 5: HUD | 10h | MEDIUM |
| Phase 6: API | 14h | MEDIUM |
| **Total** | **100h** | |

**Timeline:** 3-4 months part-time, 1.5-2 months full-time

---

## 🎯 Next Steps

1. **Review this document** - Confirm understanding
2. **Fill in blanks** - Answer questions below
3. **Prioritize features** - What's most important?
4. **Start with Phase 1** - Foundation first
5. **Test incrementally** - After each phase

---

## ❓ Questions for You

1. **Database:** Keep Firestore or migrate to PostgreSQL?
2. **Priority:** Which features are most critical for your use case?
3. **Timeline:** What's your target completion date?
4. **Testing:** Do you want to test each phase or wait until end?
5. **Frontend:** Do you need the HUD overlay, or is backend enough?
6. **Chat Platforms:** Just Twitch, or also YouTube/Kick from start?

---

**Ready to start when you are!** 🚀

