# API Routes Investigation: Cronjob and Queue Usage

## Purpose
Investigate whether the current API routes (`prepare-everything` and individual routes) follow the legacy project code flow and properly use cronjobs and OBS Priority Queue for scene switching and time-gated methods.

## Investigation Date
2024-12-19

---

## 1. Route Overview

### 1.1 Prepare-Everything Route
**Endpoint:** `POST /api/stage/prepare-everything/:mediaTitleId`

**Current Flow:**
1. `directorService.initialize()` → `PrepareStreamUseCase.execute()`
2. Create schedule via `MediaSchedulerService.createSchedule()`
3. `directorService.setCurrentSchedule(schedule)`
4. `directorService.renderNextMedia()` → `RenderNextScheduledMediaUseCase.execute()`
5. `directorService.startSchedule()` → `StartScheduleUseCase.execute()`

### 1.2 Individual Routes (Equivalent Flow)
**Routes:**
- `POST /api/stage/initialize` → `directorService.initialize()`
- `POST /api/stage/create-schedule/:mediaTitleId` → Creates schedule
- `POST /api/stage/init-schedule` → `directorService.renderNextMedia()`
- `POST /api/stage/start-schedule` → `directorService.startSchedule()`

---

## 2. Legacy Project Flow Analysis

### 2.1 Legacy `prepareStream()` Flow
```javascript
async prepareStream(){
    this.stopScheduleCronjobs()  // ✅ Stops existing cronjobs
    await this.renderBaseScenes()
}
```

**Key Points:**
- ✅ Stops existing cronjobs before preparing
- ✅ Renders base scenes
- ✅ Initializes stages

### 2.2 Legacy `renderNextScheduledMediaToAvailableStage()` Flow
```javascript
async renderNextScheduledMediaToAvailableStage(){
    // Gets stage and media
    const fileList = this.formatMediaForObs(peepedScheduledMedia.mediaQueue, stageName)
    
    // ✅ Uses OBSPQ for batch source creation
    OBSPQ.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE, async () => {
        await sources.batchCreate(fileList)
    })
    
    // Sets stage in use
    this.setStageInUse(stageToUse, {...})
    this.addStageToQueue(stageToUse)
    
    // ✅ Uses OBSPQ for setting media properties
    OBSPQ.pushToQueue(CHANGE_MEDIA_PROPERTIES_METHODTYPE, async () => {
        await sceneItems.setProperties(sourceName, {...}, stageName)
    })
}
```

**Key Points:**
- ✅ Uses OBSPQ for `BATCH_MEDIUM_CREATE_SOURCE`
- ✅ Uses OBSPQ for `CHANGE_MEDIA_PROPERTIES`
- ✅ Adds stage to queue for scheduling

### 2.3 Legacy `startSchedule()` Flow
```javascript
async startSchedule(unpause = false){
    const stageToUse = this.popNextStageInQueue()
    const nextMedia = this.formatMediaForObs(unformattedNextMedia, stageName)
    
    this.popStageNextMedia(stageToUse)
    this.setCurrentMedia(nextMedia, stageToUse)
    
    const sourceName = nextMedia.sourceName
    // ✅ Creates delayed transition cronjob
    this.startMediaAndChangeStage(sourceName, stageName, stageToUse, startTime)
    
    // ✅ Creates next media cronjob
    const secondsToAdd = nextMedia.metadata.duration + startTime + calibration
    cronModel.createJob(NEXT_SCHEDULED_MEDIA_CRONJOB, 'media', secondsToAdd, 
        this.nextMedia, null, true, this)
}
```

**Key Points:**
- ✅ Creates `CHANGE_MEDIA_FOCUS_AND_STAGE` cronjob via `startMediaAndChangeStage()`
- ✅ Creates `NEXT_SCHEDULED_MEDIA` cronjob with calculated time
- ✅ Both cronjobs are started immediately (`startAtCreation: true`)

### 2.4 Legacy `startMediaAndChangeStage()` Flow
```javascript
startMediaAndChangeStage(sourceName, stageName, stageToUse, secondsToStart = 1){
    // ✅ Creates cronjob for delayed transition
    cronModel.createJob(CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB, 'media', secondsToStart, 
        async() => {
            // ✅ Uses OBSPQ for showing media
            OBSPQ.pushToQueue(SHOW_MEDIA_METHODTYPE, async () => {
                await sceneItems.setProperties(sourceName, { visible: true }, stageName)
                this.setStageOnScreen(stageToUse)
            })
            
            // ✅ Uses OBSPQ for changing stage
            OBSPQ.pushToQueue(CHANGE_STAGE_FOCUS_METHODTYPE, async () => {
                await scene.setScene(stageName)
            })
        }, null, true, this)
}
```

**Key Points:**
- ✅ Creates `CHANGE_MEDIA_FOCUS_AND_STAGE` cronjob
- ✅ Cronjob callback uses OBSPQ for `SHOW_MEDIA` and `CHANGE_STAGE_FOCUS`
- ✅ Delayed execution (secondsToStart parameter)

### 2.5 Legacy `nextMedia()` Flow
```javascript
async nextMedia(){
    // ✅ Stops current cronjob FIRST
    cronModel.stopJob(NEXT_SCHEDULED_MEDIA_CRONJOB)
    
    // Processes media transition
    // ...
    
    // ✅ Reschedules next media cronjob
    cronModel.createJob(NEXT_SCHEDULED_MEDIA_CRONJOB, 'media', secondsToAdd, 
        this.nextMedia, null, true, this)
}
```

**Key Points:**
- ✅ Stops current `NEXT_SCHEDULED_MEDIA` cronjob before processing
- ✅ Reschedules next media cronjob after transition

---

## 3. Current Implementation Analysis

### 3.1 PrepareStreamUseCase
**File:** `src/modules/Stage/application/use-cases/PrepareStream.use-case.ts`

**Current Implementation:**
```typescript
async execute(options?: { stopCronJobs?: boolean }): Promise<void> {
    // Stop existing cron jobs if requested
    if (options?.stopCronJobs !== false) {
        await this.stopExistingCronJobs()  // ✅ Calls StopScheduleCronjobsUseCase
    }
    
    // Render base scenes
    await this.renderBaseScenesUseCase.execute()
    
    // Initialize stages
    const stages = StageManagerService.initializeStages()
}
```

**Status:** ✅ **CORRECT**
- ✅ Stops cronjobs via `StopScheduleCronjobsUseCase`
- ✅ Renders base scenes
- ✅ Initializes stages

### 3.2 RenderNextScheduledMediaUseCase
**File:** `src/modules/Stage/application/use-cases/RenderNextScheduledMedia.use-case.ts`

**Current Implementation:**
```typescript
async execute(schedule: Schedule, stages: Stage[]): Promise<Stage | null> {
    // Gets available stage and media
    const peekedMedia = MediaSchedulerService.peekNextFromSchedule(schedule, MAX_MEDIA_PER_STAGE)
    
    // Creates OBS sources directly (NOT via OBSPQ)
    await this.createOBSSources(obsSources, stageName)
    
    // Sets media properties directly (NOT via OBSPQ)
    await this.setMediaSourceProperties(activeSource, stageName)
    
    // Sets stage in use
    StageManagerService.setStageInUse(stage, mediaArray)
    StageManagerService.addStageToQueue(stage)  // ✅ Adds to queue
}
```

**Status:** ⚠️ **PARTIALLY CORRECT - MISSING OBSPQ USAGE**
- ❌ **ISSUE:** Creates OBS sources directly instead of via OBSPQ
- ❌ **ISSUE:** Sets media properties directly instead of via OBSPQ
- ✅ Adds stage to queue (correct)
- ✅ Uses `BATCH_MEDIUM_CREATE_SOURCE` equivalent (but not via queue)

**Expected (from legacy):**
- Should use `OBSPriorityQueueService.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE, ...)`
- Should use `OBSPriorityQueueService.pushToQueue(CHANGE_MEDIA_PROPERTIES_METHODTYPE, ...)`

### 3.3 StartScheduleUseCase
**File:** `src/modules/Stage/application/use-cases/StartSchedule.use-case.ts`

**Current Implementation:**
```typescript
async execute(schedule: Schedule, _stages: Stage[]): Promise<Stage | null> {
    // Gets stage from queue
    stage = StageManagerService.popNextStageInQueue()
    
    // Creates OBS sources directly
    await this.createOBSSources(obsSources, stageName)
    
    // Hides other sources
    await this.hideOtherSourcesInScene(stageName, activeSource.sourceName)
    
    // Sets media properties directly
    await this.setMediaSourceProperties(activeSource, stageName)
    
    // Sets stage in use
    StageManagerService.setStageInUse(stage, [firstMedia])
    
    // Starts media playback directly
    await this.startMediaPlayback(stage, activeSource.sourceName)
    
    // Changes scene directly
    await this.changeToStageScene(stage)
    
    // ✅ Schedules media transition cronjob
    await this.scheduleMediaTransitionUseCase.execute({
        sourceName: activeSource.sourceName,
        stageName,
        stageNumber: stage.stageNumber,
        delaySeconds: startTime,
    })
    
    // ✅ Schedules next media cronjob
    await this.scheduleNextMediaUseCase.execute({
        schedule,
        currentStage: stage,
        stages: _stages,
        mediaDuration: firstMedia.duration || 0,
        startTime,
        calibration: 5,
    })
}
```

**Status:** ⚠️ **PARTIALLY CORRECT - MIXED APPROACH**
- ❌ **ISSUE:** Creates OBS sources directly (should use OBSPQ)
- ❌ **ISSUE:** Hides sources directly (should use OBSPQ)
- ❌ **ISSUE:** Sets media properties directly (should use OBSPQ)
- ❌ **ISSUE:** Starts media playback directly (should use OBSPQ)
- ❌ **ISSUE:** Changes scene directly (should use OBSPQ or cronjob)
- ✅ Schedules media transition cronjob (correct)
- ✅ Schedules next media cronjob (correct)

**Expected (from legacy):**
- Scene change should happen via cronjob (delayed), not immediately
- OBS operations should go through OBSPQ
- Only the cronjob scheduling should happen immediately

### 3.4 ScheduleNextMediaUseCase
**File:** `src/modules/Stage/application/use-cases/ScheduleNextMedia.use-case.ts`

**Current Implementation:**
```typescript
async execute(dto: IScheduleNextMediaDTO): Promise<void> {
    const secondsToAdd = mediaDuration + startTime + calibration
    
    // ✅ Creates cronjob
    this.cronJobSchedulerService.createJob({
        name: NEXT_SCHEDULED_MEDIA_CRONJOB,
        type: 'media',
        timeInSeconds: secondsToAdd,
        callback: async () => {
            // ✅ Stops current cronjob
            this.cronJobSchedulerService.stopJob(NEXT_SCHEDULED_MEDIA_CRONJOB)
            
            // ✅ Executes next media transition
            const result = await this.nextMediaUseCase.execute(...)
            
            // ✅ Recursively schedules next media
            if (result.hasMoreMedia && result.nextStage) {
                await this.execute({...})
            }
        },
        startAtCreation: true,
    })
}
```

**Status:** ✅ **CORRECT**
- ✅ Creates cronjob with correct timing
- ✅ Stops current cronjob before executing
- ✅ Recursively schedules next media
- ✅ Matches legacy behavior

### 3.5 ScheduleMediaTransitionUseCase
**File:** `src/modules/Stage/application/use-cases/ScheduleMediaTransition.use-case.ts`

**Current Implementation:**
```typescript
async execute(dto: IScheduleMediaTransitionDTO): Promise<void> {
    // ✅ Creates cronjob
    this.cronJobSchedulerService.createJob({
        name: CHANGE_MEDIA_FOCUS_AND_STAGE_CRONJOB,
        type: 'media',
        timeInSeconds: delaySeconds,
        callback: async () => {
            // ✅ Calls MediaTransitionUseCase
            await this.mediaTransitionUseCase.execute({
                sourceName,
                stageName,
                stageNumber,
            })
        },
        startAtCreation: true,
    })
}
```

**Status:** ✅ **CORRECT**
- ✅ Creates cronjob with delay
- ✅ Calls transition use case
- ✅ Matches legacy behavior

### 3.6 MediaTransitionUseCase
**File:** `src/modules/Stage/application/use-cases/MediaTransition.use-case.ts`

**Current Implementation:**
```typescript
async execute(dto: IMediaTransitionDTO): Promise<void> {
    // ✅ Uses OBSPQ for SHOW_MEDIA
    this.obsPriorityQueueService.pushToQueue(
        OBSMethodType.SHOW_MEDIA,
        async () => {
            await this.sceneItemsService.setProperties(
                sourceName,
                { visible: true },
                stageName
            )
            // Sets stage on screen
        }
    )
    
    // ✅ Uses OBSPQ for CHANGE_STAGE_FOCUS
    this.obsPriorityQueueService.pushToQueue(
        OBSMethodType.CHANGE_STAGE_FOCUS,
        async () => {
            // Logs stage change
        }
    )
}
```

**Status:** ⚠️ **PARTIALLY CORRECT**
- ✅ Uses OBSPQ for `SHOW_MEDIA` (correct)
- ⚠️ **ISSUE:** `CHANGE_STAGE_FOCUS` only logs, doesn't actually change scene
- ❌ **MISSING:** Scene change should happen via OBSPQ

**Expected (from legacy):**
- Should push scene change command to OBSPQ
- Should use `SceneService.setScene()` via OBSPQ

### 3.7 NextMediaUseCase
**File:** `src/modules/Stage/application/use-cases/NextMedia.use-case.ts`

**Current Implementation:**
```typescript
async execute(schedule: Schedule, currentStage: Stage, stages: Stage[]): Promise<...> {
    // Stops current media directly
    await this.stopCurrentMedia(currentStage)
    
    // Processes media transition directly
    // ...
    
    // Starts media playback directly
    await this.startMediaPlayback(nextStage, nextMedia)
    
    // Changes scene directly
    await this.changeToStageScene(nextStage)
}
```

**Status:** ⚠️ **PARTIALLY CORRECT - BUT CALLED BY CRONJOB**
- ✅ Called by `ScheduleNextMediaUseCase` (via cronjob) - correct
- ❌ **ISSUE:** Performs OBS operations directly instead of via OBSPQ
- ❌ **ISSUE:** Scene changes happen immediately, not via cronjob

**Expected (from legacy):**
- Should use OBSPQ for all OBS operations
- Scene changes should be scheduled via cronjob (delayed)

---

## 4. Critical Issues Found

### 4.1 OBSPQ Usage Missing in Multiple Places

**Issue:** Several use cases perform OBS operations directly instead of using OBSPQ:

1. **RenderNextScheduledMediaUseCase:**
   - ❌ Creates sources directly
   - ❌ Sets properties directly
   - ✅ Should use: `OBSPQ.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE, ...)`
   - ✅ Should use: `OBSPQ.pushToQueue(CHANGE_MEDIA_PROPERTIES_METHODTYPE, ...)`

2. **StartScheduleUseCase:**
   - ❌ Creates sources directly
   - ❌ Hides sources directly
   - ❌ Sets properties directly
   - ❌ Starts playback directly
   - ❌ Changes scene directly
   - ✅ Should use OBSPQ for all OBS operations

3. **NextMediaUseCase:**
   - ❌ Stops media directly
   - ❌ Starts playback directly
   - ❌ Changes scene directly
   - ✅ Should use OBSPQ for all OBS operations

### 4.2 Scene Change Timing Issue

**Issue:** Scene changes happen immediately in `StartScheduleUseCase` and `NextMediaUseCase`, but legacy project uses delayed cronjobs.

**Current Flow:**
```
StartScheduleUseCase:
  1. Create sources (direct)
  2. Start playback (direct)
  3. Change scene (direct) ❌
  4. Schedule transition cronjob (10s delay)
  5. Schedule next media cronjob
```

**Legacy Flow:**
```
startSchedule():
  1. Create sources (via OBSPQ)
  2. Schedule transition cronjob (10s delay)
  3. Transition cronjob fires → Shows media + changes scene (via OBSPQ)
  4. Schedule next media cronjob
```

**Expected:**
- Scene change should NOT happen immediately in `StartScheduleUseCase`
- Scene change should happen via `CHANGE_MEDIA_FOCUS_AND_STAGE` cronjob
- The cronjob should push scene change to OBSPQ

### 4.3 MediaTransitionUseCase Missing Scene Change

**Issue:** `MediaTransitionUseCase` logs scene change but doesn't actually change the scene.

**Current:**
```typescript
this.obsPriorityQueueService.pushToQueue(
    OBSMethodType.CHANGE_STAGE_FOCUS,
    async () => {
        // Only logs, doesn't change scene ❌
        this.logger.log(`Stage ${stageNumber} is now on screen`)
    }
)
```

**Expected (from legacy):**
```javascript
// Legacy code shows:
OBSPQ.pushToQueue(CHANGE_STAGE_FOCUS_METHODTYPE, async () => {
    await scene.setScene(stageName)  // Actually changes scene
    // Additional HUD updates...
})
```

**Current Fix Needed:**
```typescript
// Should inject SceneService
constructor(
    private readonly obsPriorityQueueService: OBSPriorityQueueService,
    private readonly sceneItemsService: SceneItemsService,
    private readonly sceneService: SceneService  // Add this
) {}

// Then in execute:
this.obsPriorityQueueService.pushToQueue(
    OBSMethodType.CHANGE_STAGE_FOCUS,
    async () => {
        await this.sceneService.setScene(stageName)  // Actually change scene
        // Get stage and update state
        const stage = StageManagerService.findStageByNumber(this.stages, stageNumber)
        if (stage) {
            StageManagerService.setStageOnScreen(stage)
        }
        this.logger.log(`Stage ${stageNumber} is now on screen`)
    }
)
```

**Note:** `SceneService.setScene()` exists at `src/modules/Stage/infra/services/OBS/Scene.service.ts` and can be used.

---

## 5. Summary

### 5.1 What's Working Correctly ✅

1. **Cronjob Scheduling:**
   - ✅ `ScheduleNextMediaUseCase` correctly creates and manages cronjobs
   - ✅ `ScheduleMediaTransitionUseCase` correctly creates transition cronjobs
   - ✅ `StopScheduleCronjobsUseCase` correctly stops cronjobs
   - ✅ Cronjobs stop current job before executing (correct)

2. **Queue Management:**
   - ✅ Stages are added to queue correctly
   - ✅ Stages are popped from queue correctly

3. **Flow Structure:**
   - ✅ `prepare-everything` route follows correct sequence
   - ✅ Individual routes can achieve same result
   - ✅ DirectorService orchestrates correctly

### 5.2 What Needs Fixing ❌

1. **OBSPQ Usage:**
   - ❌ `RenderNextScheduledMediaUseCase` should use OBSPQ for source creation and properties
   - ❌ `StartScheduleUseCase` should use OBSPQ for all OBS operations
   - ❌ `NextMediaUseCase` should use OBSPQ for all OBS operations

2. **Scene Change Timing:**
   - ❌ Scene should NOT change immediately in `StartScheduleUseCase`
   - ❌ Scene change should happen via `CHANGE_MEDIA_FOCUS_AND_STAGE` cronjob
   - ❌ `MediaTransitionUseCase` should actually change scene via OBSPQ

3. **Media Playback:**
   - ❌ Media playback should be scheduled via cronjob, not started immediately
   - ❌ Or media playback should go through OBSPQ if started immediately

---

## 6. Recommendations

### 6.1 Immediate Fixes Required

1. **Update `RenderNextScheduledMediaUseCase`:**
   - Use `OBSPriorityQueueService.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE, ...)`
   - Use `OBSPriorityQueueService.pushToQueue(CHANGE_MEDIA_PROPERTIES_METHODTYPE, ...)`

2. **Update `StartScheduleUseCase`:**
   - Remove immediate scene change
   - Use OBSPQ for all OBS operations
   - Let `CHANGE_MEDIA_FOCUS_AND_STAGE` cronjob handle scene change

3. **Update `MediaTransitionUseCase`:**
   - Actually change scene via `SceneService.setScene()` in OBSPQ callback
   - Use `OBSMethodType.CHANGE_STAGE_FOCUS` properly

4. **Update `NextMediaUseCase`:**
   - Use OBSPQ for all OBS operations
   - Consider scheduling scene changes via cronjob instead of immediate

### 6.2 Questions for Clarification

1. **Scene Change Timing:**
   - Should scene change happen immediately when starting schedule, or only via cronjob?
   - Legacy shows it happens via cronjob (delayed), but current code does it immediately.

2. **Media Playback:**
   - Should media playback start immediately or be scheduled?
   - Legacy shows media starts immediately, but scene change is delayed.

3. **OBSPQ Priority:**
   - Should all OBS operations go through OBSPQ, or only certain ones?
   - Legacy shows most operations go through OBSPQ.

---

## 7. Route Comparison

### 7.1 Prepare-Everything Route Flow

**Current:**
```
POST /api/stage/prepare-everything/:mediaTitleId
  → directorService.initialize()
    → PrepareStreamUseCase.execute()
      → StopScheduleCronjobsUseCase.execute() ✅
      → RenderBaseScenesUseCase.execute()
      → StageManagerService.initializeStages()
  → Create schedule
  → directorService.setCurrentSchedule(schedule)
  → directorService.renderNextMedia()
    → RenderNextScheduledMediaUseCase.execute()
      → Creates sources directly ❌
      → Sets properties directly ❌
  → directorService.startSchedule()
    → StartScheduleUseCase.execute()
      → Creates sources directly ❌
      → Starts playback directly ❌
      → Changes scene immediately ❌
      → ScheduleMediaTransitionUseCase.execute() ✅
      → ScheduleNextMediaUseCase.execute() ✅
```

**Legacy Equivalent:**
```
GET /obs/preparestages
  → director.prepareStream()
    → stopScheduleCronjobs() ✅
    → renderBaseScenes()
GET /obs/createschedule
  → Create schedule
GET /obs/initschedule
  → director.renderNextScheduledMediaToAvailableStage()
    → OBSPQ.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE) ✅
    → OBSPQ.pushToQueue(CHANGE_MEDIA_PROPERTIES) ✅
GET /obs/startschedule
  → director.startSchedule()
    → startMediaAndChangeStage() (creates cronjob) ✅
    → cronModel.createJob(NEXT_SCHEDULED_MEDIA) ✅
```

### 7.2 Individual Routes Flow

**Current Individual Routes:**
- `POST /api/stage/initialize` → Same as prepare-everything step 1 ✅
- `POST /api/stage/create-schedule/:mediaTitleId` → Same as prepare-everything step 2 ✅
- `POST /api/stage/init-schedule` → Same as prepare-everything step 3 ⚠️ (missing OBSPQ)
- `POST /api/stage/start-schedule` → Same as prepare-everything step 4 ⚠️ (missing OBSPQ, wrong timing)

**Status:** Individual routes can achieve same result, but have same issues as prepare-everything route.

---

## 8. Detailed Code Location Issues

### 8.1 StartScheduleUseCase Issues

**File:** `src/modules/Stage/application/use-cases/StartSchedule.use-case.ts`

**Lines 97-108:** All OBS operations are direct, not via OBSPQ:
```typescript
await this.createOBSSources(obsSources, stageName)  // ❌ Direct
await this.hideOtherSourcesInScene(...)  // ❌ Direct
await this.setMediaSourceProperties(...)  // ❌ Direct
await this.startMediaPlayback(...)  // ❌ Direct
await this.changeToStageScene(stage)  // ❌ Direct + Wrong timing
```

**Issue:** Scene change happens immediately (line 108), but legacy shows it should happen via cronjob.

**Expected Flow:**
1. Create sources via OBSPQ
2. Set properties via OBSPQ
3. Start playback via OBSPQ (or keep direct if needed)
4. **DO NOT** change scene immediately
5. Schedule transition cronjob (which will change scene)

### 8.2 RenderNextScheduledMediaUseCase Issues

**File:** `src/modules/Stage/application/use-cases/RenderNextScheduledMedia.use-case.ts`

**Lines 70-90:** Source creation and properties are direct:
```typescript
await this.createOBSSources(obsSources, stageName)  // ❌ Direct
await this.setMediaSourceProperties(activeSource, stageName)  // ❌ Direct
```

**Expected:**
```typescript
// Should use OBSPQ
this.obsPriorityQueueService.pushToQueue(
    OBSMethodType.BATCH_MEDIUM_CREATE_SOURCE,
    async () => { await this.createOBSSources(obsSources, stageName) }
)

// For each source, set properties via OBSPQ
this.obsPriorityQueueService.pushToQueue(
    OBSMethodType.CHANGE_MEDIA_PROPERTIES,
    async () => { await this.setMediaSourceProperties(source, stageName) }
)
```

### 8.3 MediaTransitionUseCase Issues

**File:** `src/modules/Stage/application/use-cases/MediaTransition.use-case.ts`

**Lines 61-68:** Scene change is missing:
```typescript
this.obsPriorityQueueService.pushToQueue(
    OBSMethodType.CHANGE_STAGE_FOCUS,
    async () => {
        // Only logs, doesn't change scene ❌
        this.logger.log(`Stage ${stageNumber} is now on screen`)
    }
)
```

**Fix Needed:**
- Inject `SceneService`
- Call `sceneService.setScene(stageName)` in the callback
- Update stage state via `StageManagerService.setStageOnScreen()`

### 8.4 NextMediaUseCase Issues

**File:** `src/modules/Stage/application/use-cases/NextMedia.use-case.ts`

**Lines 100-168:** All OBS operations are direct:
```typescript
await this.stopCurrentMedia(currentStage)  // ❌ Direct
await this.startMediaPlayback(...)  // ❌ Direct
await this.changeToStageScene(nextStage)  // ❌ Direct + Wrong timing
```

**Expected:** All should go through OBSPQ, and scene change should be scheduled via cronjob.

---

## 9. Conclusion

The current implementation **partially follows** the legacy project flow:

✅ **Correct:**
- Cronjob scheduling and management
- Route structure and sequence
- Stage queue management
- `MediaTransitionUseCase` uses OBSPQ for `SHOW_MEDIA`

❌ **Incorrect:**
- Missing OBSPQ usage in `RenderNextScheduledMediaUseCase` (source creation, properties)
- Missing OBSPQ usage in `StartScheduleUseCase` (all OBS operations)
- Missing OBSPQ usage in `NextMediaUseCase` (all OBS operations)
- Scene changes happen immediately instead of via cronjob
- `MediaTransitionUseCase` doesn't actually change scene (only logs)

**Priority:** **HIGH** - The missing OBSPQ usage and incorrect scene change timing could cause:
1. OBS WebSocket overload (too many simultaneous commands)
2. Timing issues (scene changes happening at wrong time)
3. Race conditions (operations not properly queued)

**Impact:** Both `prepare-everything` route and individual routes have the same issues, so the problems are consistent across both testing methods.

---

## 10. User Answers (2024-12-19)

1. **Scene Change Timing:**
   - ✅ **Answer:** Via OBSPQ (should go through the queue, not direct)

2. **Media Playback:**
   - ✅ **Answer:** Follow legacy project rules - media is "played" instantly but not really playing until source is unhidden in OBS studio. So playback can start immediately, but actual visibility/playing happens via cronjob.

3. **OBSPQ Priority:**
   - ✅ **Answer:** Prioritize using OBSPQ, especially for heavy OBS operations like scene/source creations, especially in bulk or fastly in sequence. Need to gather information about what exceptions are direct in the legacy project.

4. **NextMediaUseCase:**
   - ✅ **Answer:** If it's doing via cronjob, maintain via cronjob.

---

## 11. Legacy Project OBSPQ vs Direct Operations Analysis

### 11.1 Direct OBS Operations (Read Operations - OK to be Direct)

From legacy project analysis, these operations are done **directly** (not via OBSPQ):

1. **Reading/Querying Operations:**
   - `scene.getScenes()` - Getting list of scenes
   - `sceneItems.getAll()` - Getting all scene items
   - `sceneItems.getProperties()` - Getting properties of a scene item
   - These are read-only operations, safe to do directly

### 11.2 OBSPQ Operations (Write Operations - Must Use OBSPQ)

All **write/modification** operations go through OBSPQ:

1. **Source Creation:**
   - `sources.create()` → `OBSPQ.pushToQueue(CREATE_SOURCE_METHODTYPE, ...)`
   - `sources.batchCreate()` → `OBSPQ.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE, ...)`

2. **Scene Operations:**
   - `scene.setScene()` → `OBSPQ.pushToQueue(CHANGE_STAGE_FOCUS_METHODTYPE, ...)`
   - `scene.batchCreate()` → `OBSPQ.pushToQueue(PREPARE_BASE_SCENES_SOURCE_METHODTYPE, ...)`

3. **Scene Item Properties:**
   - `sceneItems.setProperties()` → `OBSPQ.pushToQueue(CHANGE_MEDIA_PROPERTIES_METHODTYPE, ...)`
   - `sceneItems.setProperties(visible: true)` → `OBSPQ.pushToQueue(SHOW_MEDIA_METHODTYPE, ...)`
   - `sceneItems.setProperties(visible: false)` → `OBSPQ.pushToQueue(HIDE_MEDIA_METHODTYPE, ...)`

4. **Scene Item Removal:**
   - `sceneItems.removeItem()` → `OBSPQ.pushToQueue(VACATE_STAGE_METHODTYPE, ...)`

### 11.3 Media Playback Pattern (Legacy)

**Key Finding:** In legacy `startSchedule()`:
- Media is NOT started via `mediaControl.nextMedia()` or similar
- Media is NOT made visible immediately
- `startMediaAndChangeStage()` creates a cronjob
- The cronjob (after delay) uses OBSPQ to:
  1. Show media (set visible: true) - This triggers OBS to start playback
  2. Change scene
- **Media playback is automatic** - OBS starts playing when source becomes visible

**Pattern:**
```javascript
// startSchedule() does NOT:
// - Call mediaControl.nextMedia() or startMedia()
// - Change scene directly
// - Show media directly

// Instead:
startMediaAndChangeStage(sourceName, stageName, stageToUse, startTime)
// Creates cronjob that will:
// - Show media via OBSPQ (after delay) → OBS auto-starts playback
// - Change scene via OBSPQ (after delay)
```

**Important:** Media sources in OBS start playing automatically when they become visible. No explicit "start playback" command is needed. The `visible: true` property change triggers playback.

### 11.4 Exceptions (Edge Cases - Direct Scene Changes)

Found **2 exceptions** where scene changes are direct (not via OBSPQ):
1. Line 624: `await scene.setScene(TECHNICAL_BREAK_SCENE)` - Error/fallback case
2. Line 642: `await scene.setScene(TECHNICAL_BREAK_SCENE)` - Error/fallback case

These appear to be error handling/fallback scenarios, not normal flow.

---

## 12. Updated Fix Requirements

Based on user answers and legacy analysis:

### 12.1 StartScheduleUseCase Fixes

**Current Issues:**
- ❌ Creates sources directly
- ❌ Sets properties directly
- ❌ Starts playback directly (but this might be OK per answer #2)
- ❌ Changes scene immediately (should be via cronjob → OBSPQ)

**Required Changes:**
1. ✅ Use OBSPQ for source creation: `OBSPQ.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE, ...)`
2. ✅ Use OBSPQ for setting properties: `OBSPQ.pushToQueue(CHANGE_MEDIA_PROPERTIES_METHODTYPE, ...)`
3. ✅ Media playback can start immediately (per answer #2), but visibility should be via cronjob
4. ✅ **DO NOT** change scene immediately - let `CHANGE_MEDIA_FOCUS_AND_STAGE` cronjob handle it
5. ✅ Scene change should go through OBSPQ (per answer #1)

**✅ VERIFICATION STATUS - ALL COMPLETE:**
1. ✅ **VERIFIED** - Source creation uses OBSPQ (lines 112-117): `obsPriorityQueueService.pushToQueue(OBSMethodType.BATCH_MEDIUM_CREATE_SOURCE, ...)`
2. ✅ **VERIFIED** - Properties setting uses OBSPQ (lines 125-130): `obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_MEDIA_PROPERTIES, ...)`
3. ✅ **VERIFIED** - Media playback starts directly (line 135): `await this.startMediaPlayback(...)` - OK per user answer #2
4. ✅ **VERIFIED** - Scene change removed (line 137-138): Comment confirms "DO NOT change scene immediately - let cronjob handle it"
5. ✅ **VERIFIED** - Hide other sources uses OBSPQ (lines 122, 220-237): `hideOtherSourcesInScene()` uses `obsPriorityQueueService.pushToQueue(OBSMethodType.HIDE_MEDIA, ...)`
6. ✅ **VERIFIED** - Scene change goes through OBSPQ via `MediaTransitionUseCase` (scheduled at line 140-145)

### 12.2 RenderNextScheduledMediaUseCase Fixes

**Required Changes:**
1. ✅ Use OBSPQ for batch source creation: `OBSPQ.pushToQueue(BATCH_MEDIUM_CREATE_SOURCE_METHODTYPE, ...)`
2. ✅ Use OBSPQ for setting properties: `OBSPQ.pushToQueue(CHANGE_MEDIA_PROPERTIES_METHODTYPE, ...)`

**✅ VERIFICATION STATUS - ALL COMPLETE:**
1. ✅ **VERIFIED** - Batch source creation uses OBSPQ (lines 83-88): `obsPriorityQueueService.pushToQueue(OBSMethodType.BATCH_MEDIUM_CREATE_SOURCE, ...)`
2. ✅ **VERIFIED** - Properties setting uses OBSPQ (lines 90-115): Loop with `obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_MEDIA_PROPERTIES, ...)` for each source

### 12.3 MediaTransitionUseCase Fixes

**Required Changes:**
1. ✅ Inject `SceneService`
2. ✅ Actually change scene via OBSPQ: `OBSPQ.pushToQueue(CHANGE_STAGE_FOCUS_METHODTYPE, async () => { await sceneService.setScene(stageName) })`
3. ✅ Update stage state: `StageManagerService.setStageOnScreen(stage)`

**✅ VERIFICATION STATUS - ALL COMPLETE:**
1. ✅ **VERIFIED** - `SceneService` injected (line 27): `private readonly sceneService: SceneService`
2. ✅ **VERIFIED** - Scene change via OBSPQ (lines 67-81): `obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_STAGE_FOCUS, async () => { await this.sceneService.setScene(stageName) })`
3. ✅ **VERIFIED** - Stage state updated (lines 73-77): `StageManagerService.setStageOnScreen(stage)` called in OBSPQ callback
4. ✅ **VERIFIED** - `stages` parameter added (line 35): `async execute(dto: IMediaTransitionDTO, stages: Stage[])`

### 12.4 NextMediaUseCase Fixes

**Required Changes:**
1. ✅ Use OBSPQ for all OBS write operations
2. ✅ Maintain cronjob-based scene changes (per answer #4)
3. ✅ Stop media via OBSPQ: `OBSPQ.pushToQueue(HIDE_MEDIA_METHODTYPE, ...)`
4. ✅ Start media via OBSPQ: `OBSPQ.pushToQueue(SHOW_MEDIA_METHODTYPE, ...)`

**✅ VERIFICATION STATUS - ALL COMPLETE:**
1. ✅ **VERIFIED** - All OBS write operations use OBSPQ:
   - Stop media (line 45): `stopCurrentMedia()` uses `obsPriorityQueueService.pushToQueue(OBSMethodType.HIDE_MEDIA, ...)` (lines 144-151)
   - Show media in same stage (lines 67-73): `obsPriorityQueueService.pushToQueue(OBSMethodType.SHOW_MEDIA, ...)`
   - Show media in next stage (lines 98-104): `obsPriorityQueueService.pushToQueue(OBSMethodType.SHOW_MEDIA, ...)`
   - Scene change (lines 106-115): `obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_STAGE_FOCUS, ...)`
2. ✅ **VERIFIED** - Cronjob-based flow maintained: Called by `ScheduleNextMediaUseCase` (cronjob)
3. ✅ **VERIFIED** - Stop media via OBSPQ (lines 144-151): `HIDE_MEDIA` method type used
4. ✅ **VERIFIED** - Start media via OBSPQ (lines 67-73, 98-104): `SHOW_MEDIA` method type used
5. ✅ **VERIFIED** - SceneService injected (line 5): `private readonly sceneService: SceneService`
6. ✅ **VERIFIED** - Scene change uses OBSPQ (lines 106-115): `obsPriorityQueueService.pushToQueue(OBSMethodType.CHANGE_STAGE_FOCUS, async () => { await this.sceneService.setScene(stageName) })`

---

## 13. Final Verification Summary

**Date:** 2024-12-19  
**Status:** ✅ **ALL REQUIREMENTS COMPLETED**

### All Use Cases Verified:

1. ✅ **StartScheduleUseCase** - All 6 requirements met
2. ✅ **RenderNextScheduledMediaUseCase** - All 2 requirements met
3. ✅ **MediaTransitionUseCase** - All 4 requirements met (including stages parameter)
4. ✅ **NextMediaUseCase** - All 6 requirements met

### Key Achievements:

- ✅ All OBS write operations now use OBSPQ
- ✅ Scene changes happen via cronjob → OBSPQ (not immediate)
- ✅ Read operations (getScenes, getAll, etc.) remain direct (as per legacy pattern)
- ✅ Media playback can start immediately (per user answer #2)
- ✅ All dependencies properly injected
- ✅ Build successful, no linter errors

**Implementation Status:** ✅ **COMPLETE AND VERIFIED**

