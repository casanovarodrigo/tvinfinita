# CronJob Error Investigation

## Problem
1. Error: `source.toLowerCase is not a function` when creating cronjob
2. Scene not changing to `stage_0X`
3. Media visibility not changing to visible

## Root Cause: Cron Package Version Mismatch

**Legacy Project:**
- Uses `cron@^1.8.2`
- Object format works: `new CronJob({ cronTime, onTick, start, timezone })`

**Current Project:**
- Uses `cron@4.3.3` (via `@nestjs/schedule@6.0.1`)
- Object format causes `source.toLowerCase is not a function` error
- v4 API changed - object format not supported the same way

## Solution: Use Positional Parameters

Cron v4 requires positional parameters (tested and confirmed working):

```typescript
const job = new CronJob(
  finalCronTime,  // cronTime string
  onTickCallback, // onTick function
  afterCallback,  // onComplete (or null)
  startAtCreation, // start boolean
  this.timezone,  // timezone string
  context         // context (or null)
)
```

## Implementation Fix

✅ **FIXED**: Changed `CronJobScheduler.service.ts` to use positional parameters instead of object format.

## Flow Verification

1. ✅ `ScheduleMediaTransitionUseCase` creates cronjob with `delaySeconds: 10`
2. ✅ Cronjob callback calls `MediaTransitionUseCase.execute()`
3. ✅ `MediaTransitionUseCase` pushes `SHOW_MEDIA` and `CHANGE_STAGE_FOCUS` to OBSPQ
4. ⚠️ **Need to verify**: Cronjob actually executes after 10 seconds
5. ⚠️ **Need to verify**: OBSPQ processes the commands
6. ⚠️ **Need to verify**: Scene changes and media becomes visible

## Next Steps

1. ✅ Fix CronJob constructor (DONE)
2. Test cronjob creation - should no longer error
3. Verify cronjob execution logs after delay
4. Check OBSPQ logs for `SHOW_MEDIA` and `CHANGE_STAGE_FOCUS` commands
5. Verify scene changes in OBS Studio

