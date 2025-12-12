# Focused Implementation Plan: Legacy → DDD Migration

**Created:** 2025-10-22  
**Last Updated:** 2025-12-04  
**Status:** Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅ | Phase 2.5 (Enhancements) → Phase 5 → Phase 6 → Phase 7-9 (Not Priority)  
**Database:** PostgreSQL (migrating from Firestore)  
**Timeline:** Flexible, incremental development

---

## 🎯 Implementation Priority Order

### Phase 1: Media Discovery & Registration ✅ **COMPLETE**
**Time:** 6 hours

**Completed:**
- ✅ Repository layer (interfaces, implementations, mappers)
- ✅ TypeORM entities with proper relationships (junction tables)
- ✅ Database schema refactored (JSONB → relationships)
- ✅ MediaDiscovery integrated with PostgreSQL
- ✅ MediaRegistration controller with 3 endpoints
- ✅ All tests passing (55/55 tests)

### Phase 2: Media Scheduler (Simple Strategy Only) ✅ **COMPLETE**
**Time:** 8 hours  
**⚠️ IMPORTANT:** Only implement simple strategy. Other strategies deferred.

**Completed:**
- ✅ Schedule domain entity with nextPeekIndex tracking
- ✅ SimpleStrategy implementation (episode looping, last scheduled tracking)
- ✅ MediaScheduler domain service
- ✅ All tests passing (35 tests, 100% coverage)

### Phase 3: Director + DDD Architecture ✅ **COMPLETE**
**Time:** 22 hours  
**Note:** Core functionality complete. Chat overlays deferred to Phase 9.

**Completed:**
- ✅ Stage domain entity
- ✅ StageManager domain service
- ✅ MediaFormatter domain service
- ✅ All 5 director use cases implemented
- ✅ Director orchestration service
- ✅ Background images integrated from legacy project
- ✅ **CronJob Scheduling System** (Phase 3.4.6) - ✅ **COMPLETE**

**Recent Completions (2025-12-04):**
- ✅ **CronJob Scheduling System** fully implemented
  - ✅ CronJobSchedulerService with full job lifecycle management
  - ✅ All scheduling use cases created (ScheduleNextMedia, ScheduleMediaTransition, StopScheduleCronjobs, ListCronJobs)
  - ✅ MediaTransitionUseCase and NextMediaUseCase updated
  - ✅ OBSPQ integration verified across all use cases
  - ✅ Scene changes happen via cronjob → OBSPQ (not immediate)
  - ✅ Media visibility controlled by cronjob
  - ✅ Fixed cron v4 compatibility (Date objects for one-time execution)
  - ✅ Winston logging system integrated
- ✅ All requirements from API-ROUTES-INVESTIGATION.md met
- ✅ All requirements from CRONJOB-MIGRATION-PLAN.md Phase 0, 1, and 2 complete

**Recent Bug Fixes (2025-01-22):**
- ✅ Fixed duplicate episode rendering (added stage queue management)
- ✅ Fixed sequential rendering (added nextPeekIndex tracking)
- ✅ Fixed episode uniqueness (shallow copy in SimpleStrategy)
- ✅ Fixed source name generation (removed stage prefix, index, short ID)
- ✅ Fixed StartSchedule to always use queue (matching legacy behavior)

### Phase 4: OBS Repositories/Models ✅ **COMPLETE**
**Status:** ✅ **COMPLETE**  
**Time:** 14 hours  
**Purpose:** Test OBS integration

**Completed:**
- ✅ All OBS services implemented (Scene, SceneItems, Sources, MediaControl, SceneCollections, Output)
- ✅ OBS Priority Queue implemented with priority-based execution and cooldown management

---

## 🔄 **NEW PRIORITY: Phase 2.5 - Media Scheduler Enhancements**

**Status:** ⏸️ **PENDING** | **Time:** 12 hours | **Priority:** HIGH (Before Phase 5)

**Purpose:** Implement auto-append functionality and additional scheduling strategies to prevent playback gaps

### 2.5.1 Auto-Append Media Functionality
**Implementation Location:** `NextMediaUseCase.execute()` and `MediaSchedulerService`

**Requirements:**
- [ ] Add `appendToSchedule()` method to `MediaSchedulerService` - Append new schedule to existing schedule's `toPlay` queue
- [ ] Add `generateSchedule()` method to `MediaSchedulerService` - Generate schedule with strategy selection
- [ ] Update `NextMediaUseCase` to auto-append when schedule runs out:
  1. Change scene to `TECHNICAL_BREAK_SCENE` via OBSPQ
  2. Call `appendToFutureSchedule()` to generate new schedule
  3. Call `renderNextScheduledMediaToAvailableStage()` to render new media
  4. Vacate previous stage via OBSPQ
  5. Call `startSchedule(true)` to continue playback
- [ ] Ensure continuous media availability (no gaps in playback)

### 2.5.2 Additional Scheduling Strategies

**2.5.2.1 MultipleCommonStrategy**
- [ ] Create `src/modules/MediaCatalog/domain/services/strategies/MultipleCommonStrategy.ts`
- [ ] Rotates through multiple titles
- [ ] Respects `lastScheduledFromTitle` to avoid duplicates
- [ ] Limits time per title (85% of 1 hour = 51 minutes)
- [ ] Handles `timespan` and `timespanLimitMinutes` options

**2.5.2.2 MultipleWeightenStrategy**
- [ ] Create `src/modules/MediaCatalog/domain/services/strategies/MultipleWeightenStrategy.ts`
- [ ] Similar to MultipleCommonStrategy but uses poll votes for weighted random selection
- [ ] **Note:** Requires poll system (Phase 8) - **MOCK votes for now**
- [ ] Create mock vote service/interface that returns equal weights for all titles
- [ ] Strategy selection logic:
  - 1 title → SimpleStrategy
  - >1 title, no votes → MultipleCommonStrategy
  - >1 title, with votes → MultipleWeightenStrategy (mocked votes)

**2.5.3 Strategy Selection in MediaSchedulerService**
- [ ] Update `createSchedule()` to select strategy based on:
  - Number of titles
  - Poll votes enabled (mocked for now)
  - Options: `timespan` (default 1.5 hours), `timespanLimitMinutes` (default 10), `votesOn` (default false)

### 2.5.4 Schedule Generation from All Registered Media (Legacy Behavior)
**Issue:** Current implementation takes a `mediaTitleId` parameter, but legacy generates from ALL registered titles.

**Required Changes:**
- [ ] Update `MediaSchedulerService.createSchedule()` to:
  - Accept all registered MediaTitles from repository (not a single ID)
  - Build `titleCatalogMap` from all registered titles (similar to legacy `this.titleCatalogMap`)
  - Strategy selection based on total number of registered titles
- [ ] Update `StageController` endpoints:
  - [ ] `POST /api/stage/create-schedule` - **NOT STAGE RESPONSIBILITY** - Move to Schedule namespace. Remove `:mediaTitleId` parameter, use all registered titles
  - [ ] `POST /api/stage/prepare-everything` - **NOT STAGE RESPONSIBILITY** - Move to Director namespace (special dev route). Remove `:mediaTitleId` parameter, use all registered titles
  - [ ] `POST /api/stage/start/:mediaTitleId` - **NOT STAGE RESPONSIBILITY** - Move to Schedule namespace. Remove `:mediaTitleId` parameter, use all registered titles
- [ ] Update `DirectorService` methods to work with all titles instead of single title
- [ ] Ensure `MediaSchedulerService` can access `MediaTitleRepository` to fetch all titles

**Legacy Reference:**
- Legacy route: `GET /obs/createschedule` - No parameters, uses all registered titles
- Legacy method: `mediaScheduler.createSchedule(options)` - Uses `this.titleCatalogMap` (all titles)

---

### Phase 5: API System
**Status:** ⏸️ **PARTIALLY IMPLEMENTED** | **Time:** 10 hours (remaining) | **Purpose:** Complete API endpoints matching legacy project exactly

---

## ⚠️ **CRITICAL: HALT BEFORE IMPLEMENTATION** ⚠️

**🚨 STOP AND ASK USER BEFORE STARTING PHASE 5 IMPLEMENTATION 🚨**

**Before implementing any Phase 5 routes, we MUST discuss and decide on:**

1. **Route Naming Convention:**
   - Legacy uses `/obs/*`, `/director/*`, `/media/*` (no `/api` prefix)
   - Current uses `/api/stage/*`, `/api/media/*`
   - **Question:** Keep `/api` prefix? Use legacy paths exactly? Hybrid approach?

2. **Route Namespaces/Grouping:**
   - Legacy groups: `/obs/*` (OBS operations), `/director/*` (Director operations), `/media/*` (Media operations)
   - Current groups: `/api/stage/*`, `/api/media/*`
   - **Known Responsibilities:**
     - ⚠️ **Stage namespace** - Only stage-related operations (stage management, rendering media to stages)
     - ⚠️ **Schedule namespace** - Scheduling operations (`createschedule`, `startschedule`)
     - ⚠️ **Director namespace** - Director operations (`prepareeverything` - special dev route)
   - **Approach:**
     - ✅ **Suggest new namespaces** as needed when patterns emerge during implementation
     - ✅ **Ask user if unclear** about where a route should belong
     - ✅ Organize routes by responsibility, not just by legacy grouping
   - **Question:** How should routes be grouped/namespaced? Match legacy exactly or use NestJS module-based grouping? Should we create new logical groupings (Schedule, OBS, Media, Director, Stage)?

3. **HTTP Methods:**
   - Legacy uses `GET` for most routes (even mutations like `createschedule`, `startschedule`)
   - Current uses `POST` for mutations, `GET` for queries
   - **Question:** Match legacy (GET for everything) or use RESTful conventions (POST for mutations)?

4. **Controller Organization:**
   - Legacy has: `ObsController`, `DirectorController`, `ApiController`, `MediaRepositoryController`
   - Current has: `StageController`, `MediaRegistrationController`
   - **Question:** Create separate controllers matching legacy? Or consolidate into fewer controllers?

5. **Query Parameters vs Body:**
   - Legacy uses query parameters for most operations (`?sourceName=...`, `?sceneName=...`)
   - Current uses body for POST requests
   - **Question:** Match legacy (query params) or use body for complex data?

6. **Response Format:**
   - Legacy uses middleware with `res.locals.controller.payload`
   - Current returns direct JSON responses
   - **Question:** Match legacy response format or keep current NestJS standard responses?

**📋 DECISION CHECKLIST (Complete before implementation):**
- [ ] Route naming convention decided
- [ ] Namespace/grouping strategy decided
- [ ] HTTP method strategy decided
- [ ] Controller organization decided
- [ ] Parameter passing strategy decided
- [ ] Response format decided

**💡 RECOMMENDATION:** Discuss these decisions before starting implementation to avoid rework.

---

**Legacy Route Mapping:**

#### 5.1 OBS Director Routes (ObsController) - ⚠️ **NEEDS UPDATES**
**Legacy Base:** `/obs/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /obs/preparestages` | `POST /api/stage/initialize` | ✅ | Different method (GET→POST), different path |
| `GET /obs/createschedule` | `POST /api/stage/create-schedule/:mediaTitleId` | ⚠️ | **NOT STAGE RESPONSIBILITY** - This is scheduling-related, should be in Schedule namespace. **NEEDS UPDATE:** Remove `:mediaTitleId`, use all titles |
| `GET /obs/initschedule` | `POST /api/stage/init-schedule` | ✅ | Different method (GET→POST) |
| `GET /obs/startschedule` | `POST /api/stage/start-schedule` | ⚠️ | **NOT STAGE RESPONSIBILITY** - This is scheduling-related, should be in Schedule namespace. Different method (GET→POST) |
| `GET /obs/stopschedule` | `POST /api/stage/stop` | ✅ | Different method (GET→POST), different path |
| `GET /obs/nextscheduledmedia` | `POST /api/stage/next` | ✅ | Different method (GET→POST), different path |
| `GET /obs/showordered` | ❌ **MISSING** | ❌ | Show ordered cronjobs (uses `cronModel.showOrdered`) |

**Required Updates:**
- [ ] Update route paths to match legacy (`/obs/*` instead of `/api/stage/*`)
- [ ] Change HTTP methods to GET (legacy uses GET, current uses POST)
- [ ] **Move `createschedule` to Schedule namespace** (not stage responsibility - it's scheduling-related)
- [ ] **Move `startschedule` to Schedule namespace** (not stage responsibility - it's scheduling-related)
- [ ] Remove `:mediaTitleId` from `createschedule` route (use all titles)
- [ ] Add `GET /obs/showordered?running=true/false` endpoint

**Route Responsibility Notes:**
- ⚠️ **`createschedule`** - **NOT STAGE RESPONSIBILITY** - This is scheduling-related, should be in Schedule namespace/controller
- ⚠️ **`startschedule`** - **NOT STAGE RESPONSIBILITY** - This is scheduling-related, should be in Schedule namespace/controller
- ✅ **Stage namespace** should only control what's related to stages (stage management, rendering media to stages, etc.)

#### 5.2 Director Routes (DirectorController) - ⚠️ **MISSING**
**Legacy Base:** `/director/*` and `/obs/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /director/prepareeverything` | `POST /api/stage/prepare-everything/:mediaTitleId` | ⚠️ | **SPECIAL DEV ROUTE** - Used only in dev for quick feedback/testing. **NOT STAGE RESPONSIBILITY** - Should be in Director namespace. **NEEDS UPDATE:** Remove `:mediaTitleId`, change to GET, match path |
| `GET /director/prepareautostart` | ❌ **MISSING** | ❌ | Prepare with auto-start delays (18s, 30s) |
| `GET /obs/inusestages` | ❌ **MISSING** | ❌ | Get in-use stages info |
| `GET /obs/playhistory` | ❌ **MISSING** | ❌ | Get play history |
| `GET /obs/currenthud` | ❌ **MISSING** | ❌ | Serve HUD HTML file |

**Required Implementation:**
- [ ] `GET /director/prepareeverything` - **SPECIAL DEV ROUTE** - Used only in dev for quick feedback/testing. Remove `:mediaTitleId`, use all titles, change to GET. Should be in Director namespace (not stage)
- [ ] `GET /director/prepareautostart` - New endpoint with delayed execution
- [ ] `GET /obs/inusestages` - Get in-use stages (calls `director.getInUseStages()`)
- [ ] `GET /obs/playhistory` - Get play history (calls `director.getPlayHistory()`)
- [ ] `GET /obs/currenthud` - Serve HUD HTML file (returns `currentHud.html`)

**Route Responsibility Notes:**
- ⚠️ **`prepareeverything`** - **SPECIAL DEV ROUTE** - Used only in dev for quick feedback/testing. **NOT STAGE RESPONSIBILITY** - Should be in Director namespace/controller

#### 5.3 Media Control Routes (ApiController) - ❌ **MISSING**
**Legacy Base:** `/obs/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /obs/pauseplay` | ❌ **MISSING** | ❌ | Pause or play media (query: `sourceName`, `play`) |
| `GET /obs/restartmedia` | ❌ **MISSING** | ❌ | Restart media (query: `sourceName`) |
| `GET /obs/stopmedia` | ❌ **MISSING** | ❌ | Stop media (query: `sourceName`) |
| `GET /obs/nextmedia` | ❌ **MISSING** | ❌ | Next media in playlist (query: `sourceName`) |
| `GET /obs/previousmedia` | ❌ **MISSING** | ❌ | Previous media in playlist (query: `sourceName`) |
| `GET /obs/mediaduration` | ❌ **MISSING** | ❌ | Get media duration (query: `sourceName`) |
| `GET /obs/mediatime` | ❌ **MISSING** | ❌ | Get current media time (query: `sourceName`) |
| `GET /obs/setmediatime` | ❌ **MISSING** | ❌ | Set media time (query: `sourceName`, `timestamp`) |
| `GET /obs/mediastate` | ❌ **MISSING** | ❌ | Get media state (query: `sourceName`) |
| `GET /obs/scrubmedia` | ❌ **MISSING** | ❌ | Scrub media (query: `sourceName`, `timeOffset`) |

**Required Implementation:**
- [ ] Create `OBSController` with all media control endpoints
- [ ] All endpoints use GET method with query parameters
- [ ] Use `MediaControlService` methods (already implemented in Phase 4)

#### 5.4 Scene Collections Routes (ApiController) - ❌ **MISSING**
**Legacy Base:** `/obs/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /obs/listscenecollections` | ❌ **MISSING** | ❌ | List all scene collections |
| `GET /obs/currentscenecollection` | ❌ **MISSING** | ❌ | Get current scene collection |
| `GET /obs/setcurrentscenecollection` | ❌ **MISSING** | ❌ | Set current scene collection (query: `scName`) |

**Required Implementation:**
- [ ] Add to `OBSController` or create `SceneCollectionsController`
- [ ] Use `SceneCollectionsService` methods (already implemented in Phase 4)

#### 5.5 Scene Items Routes (ApiController) - ❌ **MISSING**
**Legacy Base:** `/obs/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /obs/listsceneitems` | ❌ **MISSING** | ❌ | List scene items (query: `sceneName`) |
| `POST /obs/sceneitemproperties` | ❌ **MISSING** | ❌ | Get scene item properties (body: `item`, `sceneName`) |
| `POST /obs/setsceneitemproperties` | ❌ **MISSING** | ❌ | Set scene item properties (body: `item`, `updateInfo`, `sceneName`) |

**Required Implementation:**
- [ ] Add to `OBSController` or create `SceneItemsController`
- [ ] Use `SceneItemsService` methods (already implemented in Phase 4)

#### 5.6 Sources Routes (ApiController) - ❌ **MISSING**
**Legacy Base:** `/obs/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /obs/mediasourceslist` | ❌ **MISSING** | ❌ | Get media sources list (current scene) |
| `GET /obs/sourcesettings` | ❌ **MISSING** | ❌ | Get source settings (query: `sourceName`, `sourceType`) |
| `GET /obs/sourceslist` | ❌ **MISSING** | ❌ | Get sources list (current collection) |
| `GET /obs/sourcestypes` | ❌ **MISSING** | ❌ | Get source types list |
| `GET /obs/sourcestypebyname` | ❌ **MISSING** | ❌ | Get source type by name (query: `displayName`) |
| `GET /obs/sourcestypebytypeid` | ❌ **MISSING** | ❌ | Get source type by type ID (query: `typeId`) |

**Required Implementation:**
- [ ] Add to `OBSController` or create `SourcesController`
- [ ] Use `SourcesService` methods (already implemented in Phase 4)

#### 5.7 Output Routes (ApiController) - ❌ **MISSING**
**Legacy Base:** `/obs/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /obs/outputlist` | ❌ **MISSING** | ❌ | Get output list |

**Required Implementation:**
- [ ] Add to `OBSController` or create `OutputController`
- [ ] Use `OutputService` methods (already implemented in Phase 4)

#### 5.8 Media Repository Routes (MediaRepositoryController) - ⚠️ **PARTIAL**
**Legacy Base:** `/media/*`

| Legacy Route | Current Route | Status | Notes |
|-------------|---------------|--------|-------|
| `GET /media/listavailabletitles` | ❌ **MISSING** | ❌ | List available titles from JSON file |
| `GET /media/listalltitlessubrepos` | ❌ **MISSING** | ❌ | List all titles with sub-repos |
| `GET /media/listmediafromtitle` | ❌ **MISSING** | ❌ | List media from title (query: `titleName`) |
| `GET /media/registertitles` | `POST /api/media/register` | ⚠️ | Different method (GET→POST), different path |
| `GET /media/savesavailabletitlestodb` | ✅ **INTEGRATED** | ✅ | Part of register endpoint |
| `GET /media/generatecontent` | ❌ **MISSING** | ❌ | Generate schedule content (calls `mediaScheduler.generateSchedule()`) |

**Required Updates:**
- [ ] Update route paths to match legacy (`/media/*` instead of `/api/media/*`)
- [ ] Change HTTP methods to GET where legacy uses GET
- [ ] Add missing endpoints: `listavailabletitles`, `listalltitlessubrepos`, `listmediafromtitle`, `generatecontent`

#### 5.9 Additional Routes
- [ ] `GET /api/stage/obs/status` - **EXTRA** (not in legacy, but useful)

**Summary:**
- ✅ **Implemented:** 11 endpoints (but some need path/method updates)
- ❌ **Missing:** 28 endpoints
- ⚠️ **Needs Update:** 3 endpoints (remove `:mediaTitleId`, change methods/paths)

**Priority:**
1. **HIGH:** Update existing routes to match legacy (paths, methods, remove `:mediaTitleId`)
2. **HIGH:** Director routes (`prepareautostart`, `inusestages`, `playhistory`, `currenthud`)
3. **MEDIUM:** OBS Director routes (`showordered`)
4. **MEDIUM:** Media Control routes (10 endpoints)
5. **LOW:** Scene Collections, Scene Items, Sources, Output routes (13 endpoints)
6. **LOW:** Media Repository additional routes (4 endpoints)

---

## ⚠️ **REMINDER: HALT BEFORE IMPLEMENTATION** ⚠️

**🚨 DO NOT START IMPLEMENTING PHASE 5 ROUTES WITHOUT USER APPROVAL 🚨**

**See the "CRITICAL: HALT BEFORE IMPLEMENTATION" section at the top of Phase 5 for discussion points.**

**All decisions about route naming, namespaces, HTTP methods, and controller organization must be made BEFORE implementation begins.**

**During Implementation:**
- ✅ **Suggest new namespaces** if patterns emerge (e.g., if we see a group of routes that logically belong together)
- ✅ **Ask user if unclear** about where a specific route should belong or what namespace to use
- ✅ Organize by responsibility, not just legacy grouping

---

### Phase 6: Base Stages & Assistant
**Status:** ⏸️ **PARTIALLY IMPLEMENTED** | **Time:** 4 hours (remaining) | **Purpose:** Complete Assistant service

**Already Implemented:**
- ✅ Base Stages constants (`MAX_STAGES = 4`, `MAX_MEDIA_PER_STAGE = 4`)
- ✅ Base stages scenes created in `RenderBaseScenesUseCase`:
  - ✅ `starting-stream` scene
  - ✅ `technical-break` scene
  - ✅ `offline-stream` scene
  - ✅ `stage_01`, `stage_02`, `stage_03`, `stage_04` scenes
- ✅ Background images integrated

**Missing - Assistant Service:**
**Create:** `src/modules/Stage/infra/services/Assistant.service.ts`

**Required Methods (Based on Legacy Project):**
- [ ] `getMediaHud()` - Returns MediaHUD instance
- [ ] `renderHudSource()` - Create HUD browser source in OBS (if not exists)
- [ ] `addHudToScene(sceneName)` - Add HUD scene to a stage scene
- [ ] `refreshHudBrowser()` - Refresh browser source
- [ ] `getTemplateInfo()` - Get template dimensions (media size, output size, stretched dimensions)
- [ ] `getTemplateOrientation()` - Returns: 'fullscreen_template', 'widescreen_template', or 'portrait_template'
- [ ] `setBaseHud()` - Set base HUD with template orientation and media timespan
- [ ] `getCurrentMediaTimespan()` - Get current media timespan (current time, total time)
- [ ] `formatSecToTimespan(seconds)` - Format seconds to HH:MM:SS
- [ ] `hideCurrentTemplate(stageName)` - Hide template in stage
- [ ] `showCurrentTemplate()` - Show template in current media stage

**Note:** Assistant service is needed for HUD functionality but HUD itself (Phase 7) is not priority.

---

### Phase 7: HUD (OBS Browser Source) ⏸️ **NOT PRIORITY**
**Status:** ⏸️ **DEFERRED** | **Time:** 6 hours | **Clarification:** HTML rendered as browser source in OBS, not frontend

**Note:** Not priority. Can be implemented later when needed.

---

### Phase 8: Poll System ⏸️ **NOT PRIORITY** (Mock Votes for Phase 2.5)
**Status:** ⏸️ **DEFERRED** | **Time:** 8 hours

**Note:** Not priority, but votes are needed for `MultipleWeightenStrategy` in Phase 2.5.

**Action Required:**
- [ ] **Create mock vote service/interface** for Phase 2.5 implementation
- [ ] Mock service should return equal weights for all titles (or configurable weights)
- [ ] Interface should match expected poll vote structure
- [ ] Full poll system implementation deferred to later

---

### Phase 9: Chat Integration ⏸️ **NOT PRIORITY** (Mock Votes for Phase 2.5)
**Status:** ⏸️ **DEFERRED** | **Time:** 22 hours  
**Note:** Should use same app functionality as API

**Action Required:**
- [ ] **Create mock vote service/interface** for Phase 2.5 implementation (same as Phase 8)
- [ ] Full chat integration deferred to later

---

## 📋 Detailed Phase Breakdown

### Phase 1: Media Discovery & Registration ✅

**Status:** ✅ **COMPLETE** | **Time:** 6 hours | **Tests:** 55/55 passing

#### 1.1 Complete MediaDiscovery ✅
**Created:** `src/modules/MediaCatalog/infra/repositories/MediaDiscovery/MediaDiscovery.ts`

- [x] File scanning, metadata extraction, validation pipeline
- [x] Integrated with MediaTitleRepository (PostgreSQL)
- [x] Removed JSON file saving
- [x] Transactional aggregate creation via `createWithMedia()`

#### 1.2 Media Registration Use Case ✅
**Flow:** Scan available-titles.json → Discover files → Extract metadata → Create entities → Save to DB

#### 1.3 Media Registration Controller ✅
**Created:** `src/modules/MediaCatalog/infra/controllers/MediaRegistration.controller.ts`

**Endpoints:**
- [x] `POST /api/media/register` - Register all titles
- [x] `GET /api/media/titles` - List all registered titles
- [x] `GET /api/media/titles/:id` - Get specific title

---

### Phase 2: Media Scheduler (Simple Strategy Only) ✅

**Status:** ✅ **COMPLETE** | **Time:** 8 hours | **Tests:** 35 tests (100% coverage)

#### 2.1 Schedule Domain Entity ✅
**Created:** `src/modules/MediaCatalog/domain/entities/Schedule/index.ts`

**Properties:** id, preStart, toPlay, lastScheduledFromTitle, unstarted, nextPeekIndex  
**Methods:** addToPreStart(), addToToPlay(), shiftToPlay(), peekToPlay(), advancePeekIndex(), etc.

- [x] Schedule domain entity (15 tests, 100% coverage)

#### 2.2 Simple Strategy ✅
**Created:** `src/modules/MediaCatalog/domain/services/strategies/SimpleStrategy.ts`

**Logic:** Single title looping, episode tracking, error handling

- [x] SimpleStrategy (6 tests, 100% coverage)

#### 2.3 MediaScheduler Domain Service ✅
**Created:** `src/modules/MediaCatalog/domain/services/MediaScheduler.service.ts`

**Methods:** createSchedule(), peekNextFromSchedule(), shiftSchedule(), isScheduleToPlayEmpty(), updateLastScheduled()

- [x] MediaScheduler domain service (10 tests + 4 integration tests)

---

### Phase 2.5: Media Scheduler Enhancements ⏸️ **NEW PRIORITY**

**Status:** ⏸️ **PENDING** | **Time:** 12 hours | **Priority:** HIGH (Before Phase 5)

See "NEW PRIORITY: Phase 2.5" section above for detailed breakdown.

---

### Phase 3: Director + DDD Architecture ✅

**Status:** ✅ **COMPLETE** | **Time:** 22 hours | **Note:** Core functionality complete. Chat overlays deferred to Phase 9.

#### 3.1 Stage Domain Entity ✅
**Created:** `src/modules/Stage/domain/entities/Stage/index.ts`

**Properties:** stageNumber, status, mediaQueue, estimatedTimeToFinish, lastUsed, combinedKey

- [x] Stage domain entity

#### 3.2 Stage Manager Domain Service ✅
**Created:** `src/modules/Stage/domain/services/StageManager.service.ts`

**Methods:** getAvailableStage(), setStageInUse(), vacateStage(), addStageToQueue(), popNextStageInQueue()

- [x] StageManager domain service

#### 3.3 Media Formatter Domain Service ✅
**Created:** `src/modules/Stage/domain/services/MediaFormatter.service.ts`

**Source Name Format:** `{sanitizedTitleName}_{sanitizedFileName}` (removed stage prefix, index, short ID)

- [x] MediaFormatter domain service

#### 3.4 Director Use Cases ✅

- [x] All 5 director use cases implemented

**3.4.1 PrepareStream Use Case ✅**
- [x] Stop existing cron jobs
- [x] Render base scenes
- [x] Initialize stages
- [x] Change to `starting-stream` scene via OBSPQ

**3.4.2 RenderBaseScenes Use Case ✅**
- [x] Set scene collection
- [x] Create base scenes (starting-stream, technical-break, offline)
- [x] Create stage scenes (stage_01, stage_02, etc.)
- [x] Create background images (from legacy project)
- [ ] Chat overlays (deferred to Phase 9)

**3.4.3 RenderNextScheduledMedia Use Case ✅**
- [x] Get available stage
- [x] Get next media from schedule (using nextPeekIndex)
- [x] Create OBS sources via OBSPQ (BATCH_MEDIUM_CREATE_SOURCE)
- [x] Set properties via OBSPQ (CHANGE_MEDIA_PROPERTIES)
- [x] Set stage in use
- [x] Add stage to queue

**3.4.4 StartSchedule Use Case ✅**
- [x] Get next stage from queue (ALWAYS from queue)
- [x] Get first media from schedule
- [x] Create OBS sources via OBSPQ
- [x] Hide other sources via OBSPQ (HIDE_MEDIA)
- [x] Set properties via OBSPQ (media initially hidden)
- [x] Media playback starts directly (per legacy pattern)
- [x] Schedule transition cronjob (CHANGE_MEDIA_FOCUS_AND_STAGE)
- [x] Schedule next media cronjob (NEXT_SCHEDULED_MEDIA)
- [x] Scene change removed from immediate execution (handled by cronjob)

**3.4.5 NextMedia Use Case ✅**
- [x] Stop current cronjob before executing
- [x] Add current to play history
- [x] Check if more media in stage
- [x] All OBS operations via OBSPQ (HIDE_MEDIA, SHOW_MEDIA, CHANGE_STAGE_FOCUS)
- [x] Scene changes via OBSPQ (not immediate)
- [x] Reschedule next media cronjob
- [ ] **Future**: Auto-append functionality when schedule runs out (legacy: `appendToFutureSchedule()`) - **NOW IN PHASE 2.5**

**3.4.6 CronJob Scheduling System ✅ COMPLETE**
**Created:** `src/modules/Stage/infra/services/CronJobScheduler.service.ts`

**Key Features:**
- [x] Schedule media changes X seconds in the future
- [x] Unique job enforcement (only one instance per job type)
- [x] Job management (create, stop, destroy, list, start)
- [x] Development mode time acceleration (18x faster)
- [x] Timezone support (America/Sao_Paulo)
- [x] Cron v4 compatibility (Date objects for one-time execution)
- [x] Winston logging integration (cronjob logger)

**Related Use Cases:**
- [x] `ScheduleNextMediaUseCase` - Creates/updates `next_scheduled_media` cronjob
- [x] `ScheduleMediaTransitionUseCase` - Creates `change_media_focus_and_stage` cronjob
- [x] `StopScheduleCronjobsUseCase` - Stops all schedule-related cronjobs
- [x] `ListCronJobsUseCase` - Lists all cronjobs with filtering
- [x] `MediaTransitionUseCase` - Triggered by cronjob, handles scene/media visibility via OBSPQ

**Integration:**
- [x] Integrated into `StartScheduleUseCase` - Schedules transition and next media cronjobs
- [x] Integrated into `PrepareStreamUseCase` - Stops existing cronjobs before preparing
- [x] All OBS operations go through OBSPQ (as per legacy project pattern)
- [x] Scene changes happen via cronjob → OBSPQ (not immediately)

**Status:** ✅ **PRODUCTION READY** - All requirements from CRONJOB-MIGRATION-PLAN.md Phase 0, 1, and 2 complete

#### 3.5 Director Orchestration Service ✅
**Created:** `src/modules/Stage/application/services/Director.service.ts`

**Features:** Coordinate use cases, manage state (current schedule, stages, current media)

- [x] Director orchestration service
- [x] Background images integrated
- [ ] Test: Full director workflow (optional - can be done during Phase 4 testing)

---

### Phase 4: OBS Repositories/Models ✅ **COMPLETE**

**Status:** ✅ **COMPLETE** | **Time:** 14 hours | **Purpose:** Test OBS integration

#### 4.1 OBS Service Layer ✅
**Created:** `src/modules/Stage/infra/services/OBS/`

- [x] Scene Service (getScenes, createScene, setScene, batchCreate)
- [x] SceneItems Service (getAll, getProperties, setProperties, removeItem)
- [x] Sources Service (create, batchCreate, getSettings, getList)
- [x] MediaControl Service (play, pause, restart, stop, scrub, getState)
- [x] SceneCollections Service (getList, setCurrent)
- [x] Output Service (getList)

#### 4.2 OBS Priority Queue ✅
**Created:** `src/modules/Stage/infra/services/OBS/OBSPriorityQueue.service.ts`

**Purpose:** Batch OBS commands to avoid overwhelming WebSocket  
**Features:** Priority-based execution, cooldown management

- [x] Create OBS Priority Queue
- [ ] Test: Verify OBS commands work (optional - can be done during Phase 5 testing)

---

### Phase 5: API System

**Status:** ⏸️ **PARTIALLY IMPLEMENTED** | **Time:** 6 hours (remaining)

See "Phase 5: API System" section above for detailed breakdown.

---

### Phase 6: Base Stages & Assistant

**Status:** ⏸️ **PARTIALLY IMPLEMENTED** | **Time:** 4 hours (remaining)

See "Phase 6: Base Stages & Assistant" section above for detailed breakdown.

---

### Phase 7: HUD (OBS Browser Source) ⏸️ **NOT PRIORITY**

**Status:** ⏸️ **DEFERRED** | **Time:** 6 hours | **Clarification:** HTML rendered as browser source in OBS, not frontend

**Note:** Not priority. Can be implemented later when needed.

---

### Phase 8: Poll System ⏸️ **NOT PRIORITY** (Mock Votes for Phase 2.5)

**Status:** ⏸️ **DEFERRED** | **Time:** 8 hours

**Note:** Not priority, but votes are needed for `MultipleWeightenStrategy` in Phase 2.5.

**Action Required:**
- [ ] **Create mock vote service/interface** for Phase 2.5 implementation
- [ ] Mock service should return equal weights for all titles (or configurable weights)
- [ ] Interface should match expected poll vote structure
- [ ] Full poll system implementation deferred to later

---

### Phase 9: Chat Integration ⏸️ **NOT PRIORITY** (Mock Votes for Phase 2.5)

**Status:** ⏸️ **DEFERRED** | **Time:** 22 hours  
**Note:** Should use same app functionality as API

**Action Required:**
- [ ] **Create mock vote service/interface** for Phase 2.5 implementation (same as Phase 8)
- [ ] Full chat integration deferred to later

---

## 🗄️ Database Migration: Firestore → PostgreSQL

### Tables Needed:
1. **media_titles** - id, title, type, created_at, updated_at
2. **playlists** - id, title, is_anchor, media_title_id, created_at, updated_at
3. **tv_show_media** - id, title, file_name, file_path, folder_name, file_ext, duration, width, height, ratio
4. **playlist_tv_show_media_junction** - playlist_id, tv_show_media_id, order (many-to-many)
5. **schedules** - id, unstarted, pre_start_queue (JSONB), to_play_queue (JSONB), last_scheduled (JSONB)
6. **polls** - id, name, votes (JSONB), started_at

**Status:** ✅ Phase 1 tables implemented with proper relationships (no JSONB for submedia)

---

## 🎯 Key Reminders

1. **Database:** PostgreSQL (migrate from Firestore) ✅
2. **Scheduler:** Simple Strategy complete, enhancements needed (Phase 2.5) ⏸️
3. **HUD:** OBS browser source (HTML), not frontend - **NOT PRIORITY**
4. **Chat:** Last priority, but should use same functionality as API - **NOT PRIORITY**
5. **Poll System:** Not priority, but mock votes needed for Phase 2.5
6. **Testing:** Ask as we go, don't over-test
7. **Timeline:** Flexible, no rush

---

## 🚀 Progress Summary

**Completed Phases:** Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅  
**Next Priority:** Phase 2.5 (Enhancements) → Phase 5 (Complete API) → Phase 6 (Complete Assistant)  
**Deferred:** Phase 7 (HUD) | Phase 8 (Poll - mock votes only) | Phase 9 (Chat - mock votes only)

**Estimated Total Time Remaining:** ~22 hours (Phase 2.5: 12h, Phase 5: 6h, Phase 6: 4h)

**Next Step:** Begin with Phase 2.5 - Media Scheduler Enhancements

**When ready, say "ACT" and we'll start with Phase 2.5!** 🎬
