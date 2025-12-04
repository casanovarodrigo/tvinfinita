# Implementation Plan: Legacy → DDD Migration

**Created:** 2025-12-04  
**Last Updated:** 2025-12-04  
**Status:** Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅ | Phase 2.5 → Phase 5 → Phase 6  
**Purpose:** Comprehensive, checkable implementation plan with legacy project references

---

## 📋 Table of Contents

1. [Phase 2.5: Media Scheduler Enhancements](#phase-25-media-scheduler-enhancements)
2. [Phase 5: API System](#phase-5-api-system)
3. [Phase 6: Base Stages & Assistant](#phase-6-base-stages--assistant)
4. [Legacy Project Reference Guide](#legacy-project-reference-guide)

---

## Phase 2.5: Media Scheduler Enhancements

**Status:** ⏸️ **PENDING** | **Priority:** HIGH (Before Phase 5) | **Time:** 12 hours

### 2.5.1 Auto-Append Media Functionality

**FROM (Legacy):** `legacy-project/src/app/core/workers/director.js:108-134` (appendToFutureSchedule)  
**FROM (Legacy):** `legacy-project/src/app/core/workers/director.js:641-652` (nextMedia when schedule empty)  
**FROM (Legacy):** `legacy-project/src/app/core/media/mediaScheduler.js:28` (`schedulesMap = new Map()`)

**TO (DDD):** Update `NextMediaUseCase`, `MediaSchedulerService`, and `DirectorService`

#### Tasks:

- [ ] **Add multiple schedule tracking to `DirectorService`**
  - **Location:** `src/modules/Stage/application/services/Director.service.ts`
  - **Purpose:** Track multiple schedules in memory (like legacy's `schedulesMap`)
  - **Legacy Reference:** `mediaScheduler.js:28` (`this.schedulesMap = new Map()`)
  - **Changes:**
    - [ ] Add `private schedulesMap: Map<string, Schedule> = new Map()`
    - [ ] Add `private currentScheduleId: string | null = null`
    - [ ] Update `setCurrentSchedule(schedule: Schedule)` to:
      - Store schedule in `schedulesMap.set(schedule.id.value, schedule)`
      - Set `currentScheduleId = schedule.id.value`
    - [ ] Update `getCurrentSchedule()` to retrieve from `schedulesMap.get(currentScheduleId)`
    - [ ] Add `getScheduleById(id: string): Schedule | null` method
    - [ ] Update `stopStreaming()` to clear `currentScheduleId = null` (keep schedules in map)
  - **Note:** Only one schedule is active at a time (`currentScheduleId`), but multiple can exist in memory

- [ ] **Add `appendToSchedule()` method to `MediaSchedulerService`**
  - **Location:** `src/modules/MediaCatalog/domain/services/MediaScheduler.service.ts`
  - **Purpose:** Append new schedule to existing schedule's `toPlay` queue
  - **Legacy Reference:** `director.js:108-134`
  - **Signature:** `appendToSchedule(schedule: Schedule, newMediaList: ITVShowMediaDTO[]): void`
  - **Logic:**
    - [ ] Add defensive null check: `if (!schedule) throw new Error('Schedule is required')`
    - [ ] Accept schedule directly (Option A - safe because architecture prevents non-set schedules)
    - [ ] Accept new schedule media list
    - [ ] Append to existing schedule's `toPlay.mediaQueue` using `schedule.addToToPlay()`
    - [ ] Update `lastScheduledFromTitle` map (extract from new media list)
    - [ ] **Note:** `lastScheduledFromTitle` persistence to DB will be implemented later

- [ ] **Add `generateSchedule()` method to `MediaSchedulerService`**
  - **Location:** `src/modules/MediaCatalog/domain/services/MediaScheduler.service.ts`
  - **Purpose:** Generate schedule with strategy selection
  - **Legacy Reference:** `legacy-project/src/app/core/media/mediaScheduler.js:245-284`
  - **Logic:**
    - Accept `scheduleId` (optional), `options` (timespan, timespanLimitMinutes, votesOn)
    - Select strategy based on number of titles and votes
    - Call selected strategy
    - Return schedule with `totalDuration`, `mediaList`, `timespanRemaining`

- [ ] **Update `NextMediaUseCase` to auto-append when schedule runs out**
  - **Location:** `src/modules/Stage/application/use-cases/NextMedia.use-case.ts`
  - **Legacy Reference:** `director.js:641-652`
  - **Flow:**
    1. [ ] Check if schedule is empty (`MediaSchedulerService.isScheduleToPlayEmpty(schedule)`)
    2. [ ] Change scene to `TECHNICAL_BREAK_SCENE` via OBSPQ (`OBSMethodType.CHANGE_STAGE_FOCUS`)
    3. [ ] Generate new schedule using `MediaSchedulerService.generateSchedule()` (with all registered titles)
    4. [ ] Call `MediaSchedulerService.appendToSchedule(schedule, newSchedule.mediaList)` to append new media
    5. [ ] Call `RenderNextScheduledMediaUseCase.execute()` to render new media to available stage
    6. [ ] Vacate previous stage via OBSPQ (`OBSMethodType.VACATE_STAGE`)
    7. [ ] Call `StartScheduleUseCase.execute()` to continue playback
  - **Legacy Code Reference:**
    ```javascript
    // director.js:641-652
    await scene.setScene(TECHNICAL_BREAK_SCENE)
    sys_logger.info("Media queue is finished. Generating more...")
    await this.appendToFutureSchedule()
    await this.renderNextScheduledMediaToAvailableStage()
    OBSPQ.pushToQueue(VACATE_STAGE_METHODTYPE, async () => {
        await this.vacateStage(currentMedia.stage)
    })
    return await this.startSchedule(true)
    ```
  - **Note:** Schedule is passed directly (Option A) - safe because `NextMediaUseCase.execute()` receives schedule as required parameter, and `DirectorService.nextMedia()` checks for schedule existence before calling

- [ ] **Ensure continuous media availability (no gaps in playback)**
  - Verify that schedule is appended before current schedule runs out
  - Test edge cases (empty schedule, single media remaining)

### 2.5.2 Additional Scheduling Strategies

#### 2.5.2.1 MultipleCommonStrategy

**FROM (Legacy):** `legacy-project/src/app/core/media/strategies/multipleCStrategy.js`  
**TO (DDD):** `src/modules/MediaCatalog/domain/services/strategies/MultipleCommonStrategy.ts`

- [ ] **Create `MultipleCommonStrategy.ts`**
  - **Location:** `src/modules/MediaCatalog/domain/services/strategies/MultipleCommonStrategy.ts`
  - **Legacy Reference:** `legacy-project/src/app/core/media/strategies/multipleCStrategy.js`
  - **Signature:** `(options: IStrategyOptions, titleCatalogMap: Map<string, ITitleInfo>, lastScheduledMedia?: Record<string, IMedia>): Promise<IStrategyResult>`
  - **Logic:**
    - [ ] Rotates through multiple titles in `titleCatalogMap`
    - [ ] Respects `lastScheduledFromTitle` to avoid duplicates (check season/order)
    - [ ] Limits time per title (85% of 1 hour = 51 minutes = `titleTimeLimit`)
    - [ ] Handles `timespan` (default 1.5 hours = 5400 seconds)
    - [ ] Handles `timespanLimitMinutes` (default 10 minutes = 600 seconds)
    - [ ] Resets `titleTimeLimit` after each title iteration
    - [ ] Skips episodes that are `next_of_double_episode` (not implemented yet, but keep logic)
    - [ ] Returns `{ totalDuration: number (in minutes), mediaList: IMedia[], timespanRemaining: number (in minutes) }`
  - **Legacy Logic Flow:**
    ```javascript
    // multipleCStrategy.js:13-50
    do {
        titleCatalogMap.forEach((title, key) => {
            if (timespan < timespanLimitMinutes || titleTimeLimit < timespanLimitMinutes) return
            if (title.episodes) {
                title.episodes.forEach(episode => {
                    // Check lastScheduledMedia to avoid duplicates
                    // Add episode to mediaList if conditions met
                    // Update timespan and titleTimeLimit
                })
            }
            titleTimeLimit = options.titleTimeLimit // Reset after each title
        })
    } while (timespan > timespanLimitMinutes)
    ```

#### 2.5.2.2 MultipleWeightenStrategy

**FROM (Legacy):** `legacy-project/src/app/core/media/strategies/multipleWeightenStrategy.js`  
**TO (DDD):** `src/modules/MediaCatalog/domain/services/strategies/MultipleWeightenStrategy.ts`

- [ ] **Create `MultipleWeightenStrategy.ts`**
  - **Location:** `src/modules/MediaCatalog/domain/services/strategies/MultipleWeightenStrategy.ts`
  - **Legacy Reference:** `legacy-project/src/app/core/media/strategies/multipleWeightenStrategy.js`
  - **Signature:** `(options: IStrategyOptions, titleCatalogMap: Map<string, ITitleInfo>, lastScheduledMedia?: Record<string, IMedia>): Promise<IStrategyResult>`
  - **Logic:**
    - [ ] Similar to MultipleCommonStrategy but uses poll votes for weighted random selection
    - [ ] Gets votes from mock vote service (for now)
    - [ ] Uses `weightedRandom()` function to select title based on probabilities
    - [ ] Handles 2-title case with `twoProbRel` (99% / 1%)
    - [ ] Handles 3+ title case with `defaultProbRel` (40% / 26.66% / 16.66%)
    - [ ] Same duplicate prevention logic as MultipleCommonStrategy
    - [ ] Same time limit logic as MultipleCommonStrategy
  - **Legacy Logic Flow:**
    ```javascript
    // multipleWeightenStrategy.js:57-117
    const votes = await poll.mediaPreferenceVote() // MOCK FOR NOW
    // Build weightenProbs array based on title count
    do {
        const random = (Math.random() * 100).toFixed(2)
        const titleName = weightedRandom(random, weightenProbs)
        const composedKey = mediaScheduler.titleNameToCatalogKeyMap.get(titleName)
        const titleToUse = titleCatalogMap.get(composedKey)
        // Same episode iteration logic as MultipleCommonStrategy
    } while (timespan > timespanLimitMinutes)
    ```

- [ ] **Create mock vote service/interface**
  - **Location:** `src/modules/MediaCatalog/infra/services/MockVote.service.ts` (or similar)
  - **Purpose:** Return equal weights for all titles (or configurable weights)
  - **Interface:** `IVoteService` with method `getMediaPreferenceVotes(): Promise<Array<[string, number]>>`
  - **Mock Implementation:**
    - Returns array of `[titleName, voteCount]` tuples
    - For now, returns equal votes for all titles
    - Should match expected poll vote structure from legacy

### 2.5.3 Strategy Selection in MediaSchedulerService

**FROM (Legacy):** `legacy-project/src/app/core/media/mediaScheduler.js:245-284` (generateSchedule)  
**TO (DDD):** `src/modules/MediaCatalog/domain/services/MediaScheduler.service.ts`

- [ ] **Update `createSchedule()` to select strategy based on:**
  - **Location:** `src/modules/MediaCatalog/domain/services/MediaScheduler.service.ts`
  - **Legacy Reference:** `mediaScheduler.js:268-273`
  - **Selection Logic:**
    - [ ] If `titleCatalogMap.size === 0` → throw error ("No registered titles")
    - [ ] If `titleCatalogMap.size === 1` → use `SimpleStrategy`
    - [ ] If `titleCatalogMap.size > 1 && !options.votesOn` → use `MultipleCommonStrategy`
    - [ ] If `titleCatalogMap.size > 1 && options.votesOn` → use `MultipleWeightenStrategy`
  - **Options Defaults:**
    - [ ] `timespan`: 1.5 hours (5400 seconds)
    - [ ] `timespanLimitMinutes`: 10 minutes (600 seconds)
    - [ ] `votesOn`: false
    - [ ] `titleTimeLimit`: 0.85 * 3600 = 3060 seconds (51 minutes)
  - **Legacy Code Reference:**
    ```javascript
    // mediaScheduler.js:268-273
    if (this.titleCatalogMap.size === 0) throw new Error("mediaScheduler: No registred titles")
    else if (this.titleCatalogMap.size === 1) strategy = singleStrategy
    else if (this.titleCatalogMap.size > 1 && !options.votesOn) strategy = multipleCommonStrategy
    else if (this.titleCatalogMap.size > 1 && options.votesOn) strategy = multipleWeightenStrategy
    ```

### 2.5.4 Schedule Generation from All Registered Media (Legacy Behavior)

**FROM (Legacy):** `legacy-project/src/app/core/media/mediaScheduler.js:61-87` (createSchedule)  
**FROM (Legacy):** `legacy-project/src/app/controllers/ObsController.js:17-26` (createSchedule route - no params)  
**TO (DDD):** Update `MediaSchedulerService` and controller endpoints

#### Issue:
Current implementation takes a `mediaTitleId` parameter, but legacy generates from ALL registered titles.

#### Required Changes:

- [ ] **Update `MediaSchedulerService.createSchedule()` to accept all registered MediaTitles**
  - **Location:** `src/modules/MediaCatalog/domain/services/MediaScheduler.service.ts`
  - **Change:** Remove `mediaTitleId` parameter, fetch all titles from repository
  - [ ] Inject `MediaTitleRepository` into `MediaSchedulerService`
  - [ ] Build `titleCatalogMap` from all registered titles (similar to legacy `this.titleCatalogMap`)
  - [ ] Strategy selection based on total number of registered titles
  - **Legacy Reference:** `mediaScheduler.js:26` (`this.titleCatalogMap = new Map()`)
  - **Legacy Reference:** `mediaScheduler.js:195-240` (`validateAvailableTitles()` builds the map)

- [ ] **Update `StageController` endpoints (move to appropriate namespaces)**
  - **Location:** `src/modules/Stage/infra/controllers/Stage.controller.ts` (or new controllers)
  - [ ] **`POST /api/stage/create-schedule`** → **Move to Schedule namespace**
    - **NOT STAGE RESPONSIBILITY** - This is scheduling-related
    - Remove `:mediaTitleId` parameter
    - Use all registered titles
    - **Legacy Reference:** `ObsController.js:17-26` (`GET /obs/createschedule` - no params)
  - [ ] **`POST /api/stage/prepare-everything/:mediaTitleId`** → **Move to Director namespace**
    - **SPECIAL DEV ROUTE** - Used only in dev for quick feedback/testing
    - **NOT STAGE RESPONSIBILITY** - Should be in Director namespace
    - Remove `:mediaTitleId` parameter
    - Use all registered titles
    - Change to GET method (match legacy)
    - **Legacy Reference:** `DirectorController.js:44-59` (`GET /director/prepareeverything` - no params)
  - [ ] **`POST /api/stage/start/:mediaTitleId`** → **Move to Schedule namespace**
    - **NOT STAGE RESPONSIBILITY** - This is scheduling-related
    - Remove `:mediaTitleId` parameter
    - Use all registered titles
    - **Legacy Reference:** `ObsController.js:38-47` (`GET /obs/startschedule` - no params)

- [ ] **Update `DirectorService` methods to work with all titles**
  - **Location:** `src/modules/Stage/application/services/Director.service.ts`
  - [ ] Update `newSchedule()` method (or equivalent) to not require `mediaTitleId`
  - [ ] Update `prepareEverything()` method (or equivalent) to not require `mediaTitleId`
  - **Legacy Reference:** `director.js:97-100` (`newSchedule()` - no params, uses all titles)

- [ ] **Ensure `MediaSchedulerService` can access `MediaTitleRepository`**
  - [ ] Add `MediaTitleRepository` to `MediaCatalogModule` providers
  - [ ] Inject repository into `MediaSchedulerService`
  - [ ] Create method to fetch all registered titles and build `titleCatalogMap`

---

## Phase 5: API System

**Status:** ⏸️ **PARTIALLY IMPLEMENTED** | **Time:** 10 hours (remaining) | **Priority:** After Phase 2.5

### ⚠️ CRITICAL: HALT BEFORE IMPLEMENTATION ⚠️

**🚨 STOP AND ASK USER BEFORE STARTING PHASE 5 IMPLEMENTATION 🚨**

**Before implementing any Phase 5 routes, we MUST discuss and decide on:**

- [ ] Route naming convention (keep `/api` prefix? Use legacy paths exactly? Hybrid?)
- [ ] Namespace/grouping strategy (match legacy or use NestJS module-based grouping?)
- [ ] HTTP method strategy (match legacy GET for everything or use RESTful conventions?)
- [ ] Controller organization (separate controllers matching legacy or consolidate?)
- [ ] Parameter passing strategy (query params like legacy or body for complex data?)
- [ ] Response format (match legacy middleware format or keep NestJS standard responses?)

**During Implementation:**
- ✅ **Suggest new namespaces** if patterns emerge
- ✅ **Ask user if unclear** about where a route should belong
- ✅ Organize by responsibility, not just legacy grouping

### 5.1 OBS Director Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/ObsController.js`  
**TO (DDD):** Update existing routes or create new controllers

#### Tasks:

- [ ] **Update `GET /obs/preparestages` route**
  - **Current:** `POST /api/stage/initialize`
  - **Legacy:** `GET /obs/preparestages` → `director.renderBaseScenes(true)`
  - **Action:** Update path to `/obs/preparestages`, change to GET method
  - **Legacy Reference:** `ObsController.js:6-16`

- [ ] **Update `GET /obs/createschedule` route**
  - **Current:** `POST /api/stage/create-schedule/:mediaTitleId`
  - **Legacy:** `GET /obs/createschedule` → `director.newSchedule()` (no params)
  - **Action:** 
    - Move to Schedule namespace (NOT STAGE RESPONSIBILITY)
    - Remove `:mediaTitleId` parameter
    - Change to GET method
    - Use all registered titles
  - **Legacy Reference:** `ObsController.js:17-26`

- [ ] **Update `GET /obs/initschedule` route**
  - **Current:** `POST /api/stage/init-schedule`
  - **Legacy:** `GET /obs/initschedule` → `director.renderNextScheduledMediaToAvailableStage()`
  - **Action:** Update path to `/obs/initschedule`, change to GET method
  - **Legacy Reference:** `ObsController.js:27-36`

- [ ] **Update `GET /obs/startschedule` route**
  - **Current:** `POST /api/stage/start-schedule`
  - **Legacy:** `GET /obs/startschedule` → `director.startSchedule()`
  - **Action:**
    - Move to Schedule namespace (NOT STAGE RESPONSIBILITY)
    - Change to GET method
  - **Legacy Reference:** `ObsController.js:38-47`

- [ ] **Update `GET /obs/stopschedule` route**
  - **Current:** `POST /api/stage/stop`
  - **Legacy:** `GET /obs/stopschedule` → `assistant.stopJob('next_scheduled_media')`
  - **Action:** Update path to `/obs/stopschedule`, change to GET method
  - **Legacy Reference:** `ObsController.js:48-57`

- [ ] **Update `GET /obs/nextscheduledmedia` route**
  - **Current:** `POST /api/stage/next`
  - **Legacy:** `GET /obs/nextscheduledmedia` → `director.nextMedia()`
  - **Action:** Update path to `/obs/nextscheduledmedia`, change to GET method
  - **Legacy Reference:** `ObsController.js:58-67`

- [ ] **Add `GET /obs/showordered` route**
  - **Current:** ❌ MISSING
  - **Legacy:** `GET /obs/showordered?running=true/false` → `cronModel.showOrdered(req.query.running)`
  - **Action:** Create new endpoint
  - **Legacy Reference:** `ObsController.js:68-77`

### 5.2 Director Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/DirectorController.js`  
**TO (DDD):** Create `DirectorController` in Director namespace

#### Tasks:

- [ ] **Add `GET /director/prepareeverything` route**
  - **Current:** `POST /api/stage/prepare-everything/:mediaTitleId`
  - **Legacy:** `GET /director/prepareeverything` → Calls `director.prepareStreamInstantly()`, `director.newSchedule()`, `director.renderNextScheduledMediaToAvailableStage()`, `director.startSchedule()`
  - **Action:**
    - Move to Director namespace (SPECIAL DEV ROUTE)
    - Remove `:mediaTitleId` parameter
    - Change to GET method
    - Use all registered titles
  - **Legacy Reference:** `DirectorController.js:44-59`

- [ ] **Add `GET /director/prepareautostart` route**
  - **Current:** ❌ MISSING
  - **Legacy:** `GET /director/prepareautostart` → Calls `director.prepareStream()`, `director.newSchedule()`, then setTimeout 18s for `renderNextScheduledMediaToAvailableStage()`, setTimeout 30s for `startSchedule()`
  - **Action:** Create new endpoint with delayed execution
  - **Legacy Reference:** `DirectorController.js:27-43`

- [ ] **Add `GET /obs/inusestages` route**
  - **Current:** ❌ MISSING
  - **Legacy:** `GET /obs/inusestages` → `director.getInUseStages()`
  - **Action:** Create new endpoint
  - **Legacy Reference:** `DirectorController.js:5-15`

- [ ] **Add `GET /obs/playhistory` route**
  - **Current:** ❌ MISSING
  - **Legacy:** `GET /obs/playhistory` → `director.getPlayHistory()`
  - **Action:** Create new endpoint
  - **Legacy Reference:** `DirectorController.js:16-26`

- [ ] **Add `GET /obs/currenthud` route**
  - **Current:** ❌ MISSING
  - **Legacy:** `GET /obs/currenthud` → Serves `currentHud.html` file from `public/html/currentHud.html`
  - **Action:** Create new endpoint to serve static HTML file
  - **Legacy Reference:** `DirectorController.js:60-66`

### 5.3 Media Control Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/ApiController.js:10-100`  
**TO (DDD):** Create `OBSController` or add to existing controller

#### Tasks:

- [ ] **Add `GET /obs/pauseplay` route**
  - **Legacy:** `GET /obs/pauseplay?sourceName=...&play=...` → `mediaControl.pauseOrPlay(req.query.sourceName, req.query.play)`
  - **Action:** Create endpoint using `MediaControlService.pauseOrPlay()`
  - **Legacy Reference:** `ApiController.js:11-19`

- [ ] **Add `GET /obs/restartmedia` route**
  - **Legacy:** `GET /obs/restartmedia?sourceName=...` → `mediaControl.restartMedia(req.query.sourceName)`
  - **Action:** Create endpoint using `MediaControlService.restart()`
  - **Legacy Reference:** `ApiController.js:20-28`

- [ ] **Add `GET /obs/stopmedia` route**
  - **Legacy:** `GET /obs/stopmedia?sourceName=...` → `mediaControl.stopMedia(req.query.sourceName)`
  - **Action:** Create endpoint using `MediaControlService.stop()`
  - **Legacy Reference:** `ApiController.js:29-37`

- [ ] **Add `GET /obs/nextmedia` route**
  - **Legacy:** `GET /obs/nextmedia?sourceName=...` → `mediaControl.nextMedia(req.query.sourceName)`
  - **Action:** Create endpoint using `MediaControlService.nextMedia()` (if exists) or implement
  - **Legacy Reference:** `ApiController.js:38-46`

- [ ] **Add `GET /obs/previousmedia` route**
  - **Legacy:** `GET /obs/previousmedia?sourceName=...` → `mediaControl.previousMedia(req.query.sourceName)`
  - **Action:** Create endpoint using `MediaControlService.previousMedia()` (if exists) or implement
  - **Legacy Reference:** `ApiController.js:47-55`

- [ ] **Add `GET /obs/mediaduration` route**
  - **Legacy:** `GET /obs/mediaduration?sourceName=...` → `mediaControl.mediaDuration(req.query.sourceName)`
  - **Action:** Create endpoint using `MediaControlService.getDuration()` (if exists) or implement
  - **Legacy Reference:** `ApiController.js:56-64`

- [ ] **Add `GET /obs/mediatime` route**
  - **Legacy:** `GET /obs/mediatime?sourceName=...` → `mediaControl.mediaTime(req.query.sourceName)`
  - **Action:** Create endpoint using `MediaControlService.getTime()` (if exists) or implement
  - **Legacy Reference:** `ApiController.js:65-73`

- [ ] **Add `GET /obs/setmediatime` route**
  - **Legacy:** `GET /obs/setmediatime?sourceName=...&timestamp=...` → `mediaControl.setMediaTime(req.query.sourceName, req.query.timestamp)`
  - **Action:** Create endpoint using `MediaControlService.setTime()` (if exists) or implement
  - **Legacy Reference:** `ApiController.js:74-82`

- [ ] **Add `GET /obs/mediastate` route**
  - **Legacy:** `GET /obs/mediastate?sourceName=...` → `mediaControl.mediaState(req.query.sourceName)`
  - **Action:** Create endpoint using `MediaControlService.getState()`
  - **Legacy Reference:** `ApiController.js:83-91`

- [ ] **Add `GET /obs/scrubmedia` route**
  - **Legacy:** `GET /obs/scrubmedia?sourceName=...&timeOffset=...` → `mediaControl.scrubMedia(req.query.sourceName, req.query.timeOffset)`
  - **Action:** Create endpoint using `MediaControlService.scrub()`
  - **Legacy Reference:** `ApiController.js:92-100`

### 5.4 Scene Collections Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/ApiController.js:104-139`  
**TO (DDD):** Add to `OBSController` or create `SceneCollectionsController`

#### Tasks:

- [ ] **Add `GET /obs/listscenecollections` route**
  - **Legacy:** `GET /obs/listscenecollections` → `sceneCollections.getAll()`
  - **Action:** Create endpoint using `SceneCollectionsService.getList()`
  - **Legacy Reference:** `ApiController.js:105-117`

- [ ] **Add `GET /obs/currentscenecollection` route**
  - **Legacy:** `GET /obs/currentscenecollection` → `sceneCollections.getCurrent()`
  - **Action:** Create endpoint using `SceneCollectionsService.getCurrent()` (if exists) or implement
  - **Legacy Reference:** `ApiController.js:118-130`

- [ ] **Add `GET /obs/setcurrentscenecollection` route**
  - **Legacy:** `GET /obs/setcurrentscenecollection?scName=...` → `sceneCollections.setCurrent(req.query.scName)`
  - **Action:** Create endpoint using `SceneCollectionsService.setCurrent()`
  - **Legacy Reference:** `ApiController.js:131-139`

### 5.5 Scene Items Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/ApiController.js:143-180`  
**TO (DDD):** Add to `OBSController` or create `SceneItemsController`

#### Tasks:

- [ ] **Add `GET /obs/listsceneitems` route**
  - **Legacy:** `GET /obs/listsceneitems?sceneName=...` → `sceneItems.getAll(req.query.sceneName)`
  - **Action:** Create endpoint using `SceneItemsService.getAll()`
  - **Legacy Reference:** `ApiController.js:144-152`

- [ ] **Add `POST /obs/sceneitemproperties` route**
  - **Legacy:** `POST /obs/sceneitemproperties` → Body: `{ item, sceneName }` → `sceneItems.getProperties(req.body.item, req.body.sceneName)`
  - **Action:** Create endpoint using `SceneItemsService.getProperties()`
  - **Legacy Reference:** `ApiController.js:153-161`

- [ ] **Add `POST /obs/setsceneitemproperties` route**
  - **Legacy:** `POST /obs/setsceneitemproperties` → Body: `{ item, updateInfo, sceneName }` → `sceneItems.setProperties(req.body.item, req.body.updateInfo, req.body.sceneName)`
  - **Action:** Create endpoint using `SceneItemsService.setProperties()`
  - **Legacy Reference:** `ApiController.js:162-180`

### 5.6 Sources Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/ApiController.js:184-240`  
**TO (DDD):** Add to `OBSController` or create `SourcesController`

#### Tasks:

- [ ] **Add `GET /obs/mediasourceslist` route**
  - **Legacy:** `GET /obs/mediasourceslist` → Gets media sources list from current scene
  - **Action:** Create endpoint (check legacy implementation details)
  - **Legacy Reference:** `ApiController.js:185-193`

- [ ] **Add `GET /obs/sourcesettings` route**
  - **Legacy:** `GET /obs/sourcesettings?sourceName=...&sourceType=...` → `sources.getSettings(req.query.sourceName, req.query.sourceType)`
  - **Action:** Create endpoint using `SourcesService.getSettings()`
  - **Legacy Reference:** `ApiController.js:194-202`

- [ ] **Add `GET /obs/sourceslist` route**
  - **Legacy:** `GET /obs/sourceslist` → `sources.getList()` (current collection)
  - **Action:** Create endpoint using `SourcesService.getList()`
  - **Legacy Reference:** `ApiController.js:203-211`

- [ ] **Add `GET /obs/sourcestypes` route**
  - **Legacy:** `GET /obs/sourcestypes` → Gets source types list
  - **Action:** Create endpoint (check legacy implementation details)
  - **Legacy Reference:** `ApiController.js:212-220`

- [ ] **Add `GET /obs/sourcestypebyname` route**
  - **Legacy:** `GET /obs/sourcestypebyname?displayName=...` → Gets source type by name
  - **Action:** Create endpoint (check legacy implementation details)
  - **Legacy Reference:** `ApiController.js:221-229`

- [ ] **Add `GET /obs/sourcestypebytypeid` route**
  - **Legacy:** `GET /obs/sourcestypebytypeid?typeId=...` → Gets source type by type ID
  - **Action:** Create endpoint (check legacy implementation details)
  - **Legacy Reference:** `ApiController.js:230-240`

### 5.7 Output Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/ApiController.js:244-252`  
**TO (DDD):** Add to `OBSController` or create `OutputController`

#### Tasks:

- [ ] **Add `GET /obs/outputlist` route**
  - **Legacy:** `GET /obs/outputlist` → `output.getList()`
  - **Action:** Create endpoint using `OutputService.getList()`
  - **Legacy Reference:** `ApiController.js:245-252`

### 5.8 Media Repository Routes

**FROM (Legacy):** `legacy-project/src/app/controllers/MediaRepositoryController.js`  
**TO (DDD):** Update existing `MediaRegistrationController` or create new controller

#### Tasks:

- [ ] **Add `GET /media/listavailabletitles` route**
  - **Legacy:** `GET /media/listavailabletitles` → `localRepoModel.listAvailableTitleList()`
  - **Action:** Create endpoint (check legacy implementation - reads from JSON file)
  - **Legacy Reference:** `MediaRepositoryController.js:6-14`

- [ ] **Add `GET /media/listalltitlessubrepos` route**
  - **Legacy:** `GET /media/listalltitlessubrepos` → `localRepoModel.listAllTitlesSubRepos()`
  - **Action:** Create endpoint (check legacy implementation)
  - **Legacy Reference:** `MediaRepositoryController.js:15-23`

- [ ] **Add `GET /media/listmediafromtitle` route**
  - **Legacy:** `GET /media/listmediafromtitle?titleName=...` → `localRepoModel.listRegistredTitleMedia(req.query.titleName)`
  - **Action:** Create endpoint using `MediaTitleRepository`
  - **Legacy Reference:** `MediaRepositoryController.js:24-32`

- [ ] **Update `GET /media/registertitles` route**
  - **Current:** `POST /api/media/register`
  - **Legacy:** `GET /media/registertitles` → `localRepoModel.registerTitles()`
  - **Action:** Update path to `/media/registertitles`, change to GET method
  - **Legacy Reference:** `MediaRepositoryController.js:33-42`

- [ ] **Add `GET /media/generatecontent` route**
  - **Legacy:** `GET /media/generatecontent` → `mediaScheduler.generateSchedule()`
  - **Action:** Create endpoint that calls `MediaSchedulerService.generateSchedule()`
  - **Legacy Reference:** `MediaRepositoryController.js:53-63`

---

## Phase 6: Base Stages & Assistant

**Status:** ⏸️ **PARTIALLY IMPLEMENTED** | **Time:** 4 hours (remaining) | **Priority:** After Phase 5

### 6.1 Base Stages ✅ COMPLETE

**Already Implemented:**
- ✅ Base Stages constants (`MAX_STAGES = 4`, `MAX_MEDIA_PER_STAGE = 4`)
- ✅ Base stages scenes created in `RenderBaseScenesUseCase`:
  - ✅ `starting-stream` scene
  - ✅ `technical-break` scene
  - ✅ `offline-stream` scene
  - ✅ `stage_01`, `stage_02`, `stage_03`, `stage_04` scenes
- ✅ Background images integrated

### 6.2 Assistant Service

**FROM (Legacy):** `legacy-project/src/app/core/workers/assistant.js`  
**TO (DDD):** `src/modules/Stage/infra/services/Assistant.service.ts`

#### Tasks:

- [ ] **Create `Assistant.service.ts`**
  - **Location:** `src/modules/Stage/infra/services/Assistant.service.ts`
  - **Legacy Reference:** `legacy-project/src/app/core/workers/assistant.js`

- [ ] **Implement `getMediaHud()` method**
  - **Purpose:** Returns MediaHUD instance
  - **Legacy Reference:** `assistant.js:35-37`
  - **Returns:** `MediaHUD` instance (needs to be created/imported)

- [ ] **Implement `renderHudSource()` method**
  - **Purpose:** Create HUD browser source in OBS (if not exists)
  - **Legacy Reference:** `assistant.js:40-53`
  - **Logic:**
    - Check if `MEDIA_HUD` source exists in `HUD_SCENE`
    - If not, create browser source via OBSPQ (`CREATE_SOURCE_METHODTYPE`)
    - Source settings: `{ url: 'http://localhost:4000/obs/currenthud', width: 1920, height: 1080 }`
  - **Uses:** `SceneItemsService.getAll()`, `SourcesService.create()`, `OBSPriorityQueueService`

- [ ] **Implement `addHudToScene(sceneName)` method**
  - **Purpose:** Add HUD scene to a stage scene
  - **Legacy Reference:** `assistant.js:55-64`
  - **Logic:**
    - Check if `HUD_SCENE` is already in the scene
    - If not, add via OBSPQ (`CREATE_SOURCE_METHODTYPE`)
    - If exists, refresh browser source
  - **Uses:** `SceneItemsService.getAll()`, `SceneItemsService.addItem()`, `OBSPriorityQueueService`, `refreshHudBrowser()`

- [ ] **Implement `refreshHudBrowser()` method**
  - **Purpose:** Refresh browser source
  - **Legacy Reference:** `assistant.js:66-68`
  - **Uses:** `SourcesService.refreshBrowserSource()` (needs to be implemented or checked)

- [ ] **Implement `getTemplateInfo()` method**
  - **Purpose:** Get template dimensions (media size, output size, stretched dimensions)
  - **Legacy Reference:** `assistant.js:74-92`
  - **Logic:**
    - Get current media from `DirectorService.getCurrentMedia()`
    - Get media size from `currentMedia.mediaInfo.metadata`
    - Get output size (default: `{ width: 1920, height: 1080 }` or from OBS output)
    - Calculate stretched dimensions using `stretchMedia()` helper
    - Return `{ mediaSize, outputSize, strectchedDim }`
  - **Uses:** `DirectorService`, `stretchMedia()` helper (needs to be created/imported)

- [ ] **Implement `getTemplateOrientation()` method**
  - **Purpose:** Returns: 'fullscreen_template', 'widescreen_template', or 'portrait_template'
  - **Legacy Reference:** `assistant.js:94-106`
  - **Logic:**
    - Get template info from `getTemplateInfo()`
    - Calculate `stageRatio = outputSize.width / outputSize.height`
    - Calculate `mediaRatio = mediaSize.width / mediaSize.height`
    - Return 'fullscreen_template' if `mediaRatio === stageRatio`
    - Return 'portrait_template' if `mediaRatio < stageRatio`
    - Return 'widescreen_template' if `mediaRatio > stageRatio`
  - **Uses:** `getTemplateInfo()`

- [ ] **Implement `setBaseHud()` method**
  - **Purpose:** Set base HUD with template orientation and media timespan
  - **Legacy Reference:** `assistant.js:108-116`
  - **Logic:**
    - Get template orientation from `getTemplateOrientation()`
    - Get media timespan from `getCurrentMediaTimespan()`
    - Call `mediaHUD.renderBaseHUD(templateOrientation, { mediaTimeInfo })`
  - **Uses:** `getTemplateOrientation()`, `getCurrentMediaTimespan()`, `MediaHUD.renderBaseHUD()`

- [ ] **Implement `getCurrentMediaTimespan()` method**
  - **Purpose:** Get current media timespan (current time, total time)
  - **Legacy Reference:** `assistant.js:137-148`
  - **Logic:**
    - Get current media from `DirectorService.getCurrentMedia()`
    - Get media time from `MediaControlService.mediaTime(sourceName)`
    - Format total timespan using `formatSecToTimespan(duration)`
    - Format current timespan using `formatSecToTimespan((timestamp / 1000) + 1)`
    - Return `{ currentTimespan: string, totalTimespan: string }`
  - **Uses:** `DirectorService`, `MediaControlService.mediaTime()`, `formatSecToTimespan()`

- [ ] **Implement `formatSecToTimespan(seconds)` method**
  - **Purpose:** Format seconds to HH:MM:SS
  - **Legacy Reference:** `assistant.js:150-152`
  - **Logic:** `new Date(parseInt(seconds) * 1000).toISOString().substr(11, 8)`
  - **Returns:** String in format "HH:MM:SS"

- [ ] **Implement `hideCurrentTemplate(stageName)` method**
  - **Purpose:** Hide template in stage
  - **Legacy Reference:** `assistant.js:118-124`
  - **Logic:**
    - Use OBSPQ (`HIDE_SCENE_ITEM_METHODTYPE`)
    - Call `SceneItemsService.setProperties(CURRENT_TEMPLATE, { visible: false }, stageName)`
  - **Uses:** `OBSPriorityQueueService`, `SceneItemsService`

- [ ] **Implement `showCurrentTemplate()` method**
  - **Purpose:** Show template in current media stage
  - **Legacy Reference:** `assistant.js:126-135`
  - **Logic:**
    - Get current media from `DirectorService.getCurrentMedia()`
    - Get stage name from `DirectorService.formatStageName(currentMedia.stage)`
    - Use OBSPQ (`HIDE_SCENE_ITEM_METHODTYPE`)
    - Call `SceneItemsService.setProperties(CURRENT_TEMPLATE, { visible: true }, stageName)`
  - **Uses:** `DirectorService`, `OBSPriorityQueueService`, `SceneItemsService`

**Note:** Assistant service is needed for HUD functionality but HUD itself (Phase 7) is not priority.

---

## Legacy Project Reference Guide

### Important Notes

#### `lastScheduledFromTitle` Feature
- **Purpose:** Tracks the last scheduled media from each title to enable resuming scheduling from that point forward
- **Implementation Status:** ⏸️ **DEFERRED** - Will be implemented later
- **Legacy Behavior:** 
  - Stored in schedule object: `schedule.lastScheduledFromTitle[titleKey] = lastMedia`
  - Persisted to database (Firestore in legacy): `saveLastScheduledToDB(lastScheduledFromTitle, scheduleId)`
  - Used when generating new schedules to avoid duplicates and continue from last scheduled episode
- **Current Status:** Schedule entity has `lastScheduledFromTitle` property, but persistence not yet implemented

#### Multiple Schedule Tracking
- **Legacy:** `schedulesMap = new Map<string, Schedule>()` - Can track multiple schedules by ID
- **Legacy:** `director.currentScheduleId` - Only ONE schedule is active at a time
- **Reason:** Allows appending to existing schedules when `appendToFutureSchedule()` is called
- **Current Implementation:** Will add `schedulesMap` to `DirectorService` to match legacy behavior

### Key Files and Locations

#### Media Scheduler
- **Location:** `legacy-project/src/app/core/media/mediaScheduler.js`
- **Key Methods:**
  - `createSchedule(options, scheduleId)` - Lines 61-87
  - `generateSchedule(scheduleId, options)` - Lines 245-284
  - `validateAvailableTitles()` - Lines 195-240
  - `peekNextFromSchedule()` - Lines 96-132
  - `shiftSchedule()` - Lines 139-161

#### Director
- **Location:** `legacy-project/src/app/core/workers/director.js`
- **Key Methods:**
  - `newSchedule()` - Lines 97-100
  - `appendToFutureSchedule()` - Lines 108-134
  - `nextMedia()` - Lines 641-652 (when schedule empty)
  - `prepareStream()` - Lines 137-140
  - `prepareStreamInstantly()` - Lines 142-145
  - `startSchedule()` - Lines 200-250 (approx)

#### Strategies
- **SimpleStrategy:** `legacy-project/src/app/core/media/strategies/singleStrategy.js`
- **MultipleCommonStrategy:** `legacy-project/src/app/core/media/strategies/multipleCStrategy.js`
- **MultipleWeightenStrategy:** `legacy-project/src/app/core/media/strategies/multipleWeightenStrategy.js`

#### Controllers
- **ObsController:** `legacy-project/src/app/controllers/ObsController.js`
- **DirectorController:** `legacy-project/src/app/controllers/DirectorController.js`
- **ApiController:** `legacy-project/src/app/controllers/ApiController.js`
- **MediaRepositoryController:** `legacy-project/src/app/controllers/MediaRepositoryController.js`

#### Assistant
- **Location:** `legacy-project/src/app/core/workers/assistant.js`
- **All methods:** Lines 35-163

### Constants and Types

#### Scene Names
- `STARTING_STREAM_SCENE = 'starting-stream'`
- `TECHNICAL_BREAK_SCENE = 'technical-break'`
- `OFFLINE_SCENE = 'offline-stream'`
- `HUD_SCENE = 'hud'` (from `hudTypes.js`)

#### Cronjob Names
- `NEXT_SCHEDULED_MEDIA_CRONJOB = 'next_scheduled_media'`
- `CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB = 'change_media_focus_and_stage'`

#### OBS Priority Queue Method Types
- `BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE`
- `CHANGE_MEDIA_PROPERTIES_METHODTYPE`
- `SHOW_MEDIA_METHODTYPE`
- `HIDE_MEDIA_METHODTYPE`
- `CHANGE_STAGE_FOCUS_METHODTYPE`
- `VACATE_STAGE_METHODTYPE`
- `CREATE_SOURCE_METHODTYPE`
- `HIDE_SCENE_ITEM_METHODTYPE`

### Strategy Options Defaults

```typescript
{
  timespan: 1.5 * 3600,           // 5400 seconds (1.5 hours)
  timespanLimitMinutes: 10 * 60,  // 600 seconds (10 minutes)
  votesOn: false,                  // Default: no votes
  titleTimeLimit: 0.85 * 3600     // 3060 seconds (51 minutes)
}
```

### Schedule Structure

```typescript
{
  id: string,
  unstarted: boolean,
  preStart: {
    mediaQueue: IMedia[],
    totalDuration: number
  },
  toPlay: {
    mediaQueue: IMedia[],
    totalDuration: number
  },
  lastScheduledFromTitle: Record<string, IMedia>
}
```

---

## Progress Tracking

### Phase 2.5: Media Scheduler Enhancements
- **Total Tasks:** 20
- **Completed:** 0
- **Remaining:** 20

### Phase 5: API System
- **Total Tasks:** 39
- **Completed:** 0
- **Remaining:** 39

### Phase 6: Base Stages & Assistant
- **Total Tasks:** 11
- **Completed:** 0
- **Remaining:** 11

### Overall Progress
- **Total Tasks:** 70
- **Completed:** 0
- **Remaining:** 70
- **Completion:** 0%

---

**Last Updated:** 2025-12-04  
**Next Priority:** Phase 2.5 - Media Scheduler Enhancements

