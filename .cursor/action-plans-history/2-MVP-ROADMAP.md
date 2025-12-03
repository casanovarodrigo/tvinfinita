# MVP Roadmap: Getting to Working App with OBS & Chat Integration

**Created:** 2025-10-22  
**Goal:** Get a working end-to-end system connecting Media Catalog → OBS Studio → Twitch/YouTube/Kick Chat  
**Timeline:** Short to Mid-term (2-4 weeks)

---

## 🎯 End Goal Vision

```
User Flow:
1. Scan media files → Catalog stored in DB
2. Select media from catalog → Load into OBS scene
3. Control playback via API → OBS plays media
4. Chat commands (Twitch/YT/Kick) → Control playback
```

---

## 📊 Current State Assessment

### ✅ What You Have
- Domain entities working (MediaTitle, Playlist, TVShowMedia)
- All tests passing (55 tests)
- OBS WebSocket singleton (basic connection)
- MediaDiscovery can scan files
- PostgreSQL configured

### ❌ What's Missing for MVP
- **Data persistence** (repositories not implemented)
- **API endpoints** (no way to interact)
- **OBS integration** (can't load/control media)
- **Chat integration** (no chat bot/commands)

---

## 🚀 MVP Strategy: "Minimum Viable Product First"

**Philosophy:** Get something working end-to-end, then refine architecture.

**Approach:**
1. **Week 1:** Get basic persistence + API working
2. **Week 2:** OBS integration (load media, play/pause)
3. **Week 3:** Chat integration (basic commands)
4. **Week 4:** Polish & error handling

---

## Phase 1: Core Data Flow (Week 1)
**Goal:** Store and retrieve media from database

### Priority 1.1: Fix TypeORM Entities (2 hours)
**Why:** Foundation for everything else

**Files to fix:**
- `src/modules/MediaCatalog/infra/entities/tv-show-media.entity.ts`
- `src/modules/MediaCatalog/infra/entities/media-title.entity.ts`
- Create `src/modules/MediaCatalog/infra/entities/playlist.entity.ts`

**Quick fixes:**
```typescript
// tv-show-media.entity.ts
@Entity('tv_show_media')
export class TVShowMediaEntity {
  @PrimaryColumn('uuid')
  id: string

  @Column('varchar', { length: 150 })
  title: string

  @Column('varchar', { length: 150 })
  fileName: string

  @Column('varchar', { length: 200 })
  filePath: string

  @Column('int')
  duration: number

  @Column('int')
  width: number

  @Column('int')
  height: number

  // ... rest
}
```

### Priority 1.2: Basic Repository Implementation (4 hours)
**Why:** Need to save/load data

**Create:**
- `src/modules/MediaCatalog/infra/repositories/MediaTitle.repository.ts`
- `src/modules/MediaCatalog/infra/repositories/Playlist.repository.ts`

**MVP Approach:** Keep it simple, don't over-engineer
```typescript
@Injectable()
export class MediaTitleRepository {
  constructor(
    @InjectRepository(MediaTitleEntity)
    private typeormRepo: Repository<MediaTitleEntity>
  ) {}

  async save(mediaTitle: MediaTitle): Promise<void> {
    const entity = this.toEntity(mediaTitle)
    await this.typeormRepo.save(entity)
  }

  async findById(id: string): Promise<MediaTitle | null> {
    const entity = await this.typeormRepo.findOne({ where: { id } })
    return entity ? this.toDomain(entity) : null
  }

  // Simple conversion methods
  private toEntity(domain: MediaTitle): MediaTitleEntity { ... }
  private toDomain(entity: MediaTitleEntity): MediaTitle { ... }
}
```

### Priority 1.3: Basic API Endpoints (3 hours)
**Why:** Need HTTP interface

**Create:**
- `src/modules/MediaCatalog/infra/controllers/MediaTitle.controller.ts`
- `src/modules/MediaCatalog/infra/controllers/Playlist.controller.ts`

**MVP Endpoints:**
```typescript
@Controller('api/media-titles')
export class MediaTitleController {
  constructor(private repo: MediaTitleRepository) {}

  @Get()
  async findAll() {
    return this.repo.findAll()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.repo.findById(id)
  }

  @Post()
  async create(@Body() dto: CreateMediaTitleDto) {
    // Simple creation
  }
}
```

**Test:** Use Postman/curl to verify data flow

---

## Phase 2: OBS Integration (Week 2)
**Goal:** Load media into OBS and control playback

### Priority 2.1: OBS Service Layer (4 hours)
**Why:** Need to interact with OBS properly

**Create:**
- `src/modules/Stage/infra/services/OBS.service.ts`

**Key Methods:**
```typescript
@Injectable()
export class OBSService {
  constructor(private obsSocket: OBSSocket) {}

  async loadMediaToScene(
    sceneName: string,
    sourceName: string,
    filePath: string
  ): Promise<void> {
    const socket = await this.obsSocket.getSocket()
    
    // Set media source file
    await socket.call('SetInputSettings', {
      inputName: sourceName,
      inputSettings: {
        local_file: filePath
      }
    })
  }

  async playMedia(sourceName: string): Promise<void> {
    const socket = await this.obsSocket.getSocket()
    await socket.call('TriggerMediaInputAction', {
      inputName: sourceName,
      mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART'
    })
  }

  async pauseMedia(sourceName: string): Promise<void> {
    const socket = await this.obsSocket.getSocket()
    await socket.call('TriggerMediaInputAction', {
      inputName: sourceName,
      mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE'
    })
  }

  async getMediaState(sourceName: string): Promise<MediaState> {
    const socket = await this.obsSocket.getSocket()
    const state = await socket.call('GetMediaInputStatus', {
      inputName: sourceName
    })
    return {
      isPlaying: state.mediaState === 'OBS_MEDIA_STATE_PLAYING',
      duration: state.mediaDuration,
      currentTime: state.mediaCursor
    }
  }
}
```

### Priority 2.2: Stage Controller (2 hours)
**Why:** API to control OBS

**Create:**
- `src/modules/Stage/infra/controllers/Stage.controller.ts`

**Endpoints:**
```typescript
@Controller('api/stage')
export class StageController {
  constructor(private obsService: OBSService) {}

  @Post('load')
  async loadMedia(@Body() dto: LoadMediaDto) {
    await this.obsService.loadMediaToScene(
      dto.sceneName,
      dto.sourceName,
      dto.filePath
    )
    return { success: true }
  }

  @Post('play')
  async play(@Body() dto: { sourceName: string }) {
    await this.obsService.playMedia(dto.sourceName)
    return { success: true }
  }

  @Post('pause')
  async pause(@Body() dto: { sourceName: string }) {
    await this.obsService.pauseMedia(dto.sourceName)
    return { success: true }
  }

  @Get('status/:sourceName')
  async getStatus(@Param('sourceName') sourceName: string) {
    return this.obsService.getMediaState(sourceName)
  }
}
```

### Priority 2.3: Connect Media Catalog to OBS (3 hours)
**Why:** Select media from catalog and load to OBS

**Create Use Case:**
- `src/modules/Stage/application/use-cases/LoadMediaFromCatalog.use-case.ts`

```typescript
@Injectable()
export class LoadMediaFromCatalogUseCase {
  constructor(
    private mediaRepo: MediaTitleRepository,
    private obsService: OBSService
  ) {}

  async execute(request: {
    mediaTitleId: string
    playlistId?: string
    episodeIndex?: number
    sceneName: string
    sourceName: string
  }): Promise<void> {
    // 1. Get media from catalog
    const mediaTitle = await this.mediaRepo.findById(request.mediaTitleId)
    if (!mediaTitle) throw new Error('Media not found')

    // 2. Get specific episode
    const playlist = request.playlistId 
      ? mediaTitle.playlists.find(p => p.id.value === request.playlistId)
      : mediaTitle.basePlaylist

    const episode = playlist.getSubmediaAtIndex(request.episodeIndex || 0)
    if (!episode) throw new Error('Episode not found')

    // 3. Load to OBS
    await this.obsService.loadMediaToScene(
      request.sceneName,
      request.sourceName,
      episode.filePath.value
    )
  }
}
```

**Test:** 
1. Call API to load media
2. Verify it appears in OBS
3. Test play/pause

---

## Phase 3: Chat Integration (Week 3)
**Goal:** Control playback via chat commands

### Priority 3.1: Chat Service Abstraction (3 hours)
**Why:** Support multiple platforms

**Create:**
- `src/modules/Chat/domain/interfaces/IChatProvider.interface.ts`
- `src/modules/Chat/infra/providers/Twitch.provider.ts`
- `src/modules/Chat/infra/providers/YouTube.provider.ts`
- `src/modules/Chat/infra/providers/Kick.provider.ts`

**Interface:**
```typescript
export interface IChatProvider {
  connect(): Promise<void>
  onMessage(callback: (message: ChatMessage) => void): void
  sendMessage(channel: string, message: string): Promise<void>
}

export interface ChatMessage {
  platform: 'twitch' | 'youtube' | 'kick'
  username: string
  message: string
  channel: string
  timestamp: Date
}
```

### Priority 3.2: Twitch Integration (4 hours)
**Why:** Most common platform

**Install:** `npm install tmi.js`

**Implementation:**
```typescript
import * as tmi from 'tmi.js'

@Injectable()
export class TwitchProvider implements IChatProvider {
  private client: tmi.Client

  async connect(): Promise<void> {
    this.client = new tmi.Client({
      options: { debug: true },
      identity: {
        username: process.env.TWITCH_BOT_USERNAME,
        password: process.env.TWITCH_OAUTH_TOKEN
      },
      channels: [process.env.TWITCH_CHANNEL]
    })

    await this.client.connect()
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.client.on('message', (channel, userstate, message, self) => {
      if (self) return

      callback({
        platform: 'twitch',
        username: userstate.username,
        message: message.trim(),
        channel: channel.replace('#', ''),
        timestamp: new Date()
      })
    })
  }

  async sendMessage(channel: string, message: string): Promise<void> {
    await this.client.say(channel, message)
  }
}
```

### Priority 3.3: Command Handler (4 hours)
**Why:** Parse and execute chat commands

**Create:**
- `src/modules/Chat/application/services/CommandHandler.service.ts`

**Commands:**
```typescript
@Injectable()
export class CommandHandlerService {
  constructor(
    private obsService: OBSService,
    private mediaRepo: MediaTitleRepository
  ) {}

  async handleCommand(message: ChatMessage): Promise<string | null> {
    const [command, ...args] = message.message.split(' ')

    switch (command.toLowerCase()) {
      case '!play':
        await this.obsService.playMedia('Media Source')
        return 'Playing media!'

      case '!pause':
        await this.obsService.pauseMedia('Media Source')
        return 'Paused!'

      case '!skip':
        // Skip to next episode
        return 'Skipping...'

      case '!list':
        // List available media
        const titles = await this.mediaRepo.findAll()
        return `Available: ${titles.map(t => t.title).join(', ')}`

      case '!load':
        // Load specific media
        const title = await this.mediaRepo.findByTitle(args[0])
        if (title) {
          await this.loadMediaToOBS(title)
          return `Loaded: ${title.title}`
        }
        return 'Media not found'

      default:
        return null // Not a command
    }
  }
}
```

### Priority 3.4: Chat Controller/Service (2 hours)
**Why:** Wire everything together

**Create:**
- `src/modules/Chat/infra/services/Chat.service.ts`

```typescript
@Injectable()
export class ChatService {
  private providers: IChatProvider[] = []

  constructor(
    private commandHandler: CommandHandlerService,
    private twitchProvider: TwitchProvider
  ) {}

  async start(): Promise<void> {
    // Connect to all providers
    await this.twitchProvider.connect()
    this.providers.push(this.twitchProvider)

    // Listen for messages
    this.twitchProvider.onMessage(async (message) => {
      const response = await this.commandHandler.handleCommand(message)
      if (response) {
        await this.twitchProvider.sendMessage(message.channel, response)
      }
    })
  }
}
```

**Test:**
1. Connect to Twitch chat
2. Send `!play` command
3. Verify OBS responds

---

## Phase 4: Polish & Integration (Week 4)
**Goal:** Make it production-ready

### Priority 4.1: Error Handling (2 hours)
- Add try-catch blocks
- Return proper error responses
- Log errors

### Priority 4.2: Configuration (1 hour)
- Environment variables
- OBS scene/source names configurable
- Chat channel configurable

### Priority 4.3: Basic Frontend (Optional, 4 hours)
- Simple HTML page to:
  - Browse media catalog
  - Click to load to OBS
  - See current playing media
  - View chat commands

### Priority 4.4: Testing End-to-End (2 hours)
- Test full flow: Scan → Catalog → Load → Play → Chat control
- Fix any issues

---

## 🎯 Quick Wins Strategy

### Week 1 Quick Win: "I can save and retrieve media"
- Fix entities → Create repository → Test with Postman
- **Result:** Data persistence working

### Week 2 Quick Win: "I can control OBS from API"
- OBS service → Controller → Test with Postman
- **Result:** OBS integration working

### Week 3 Quick Win: "Chat commands work"
- Twitch provider → Command handler → Test in real chat
- **Result:** Chat integration working

### Week 4 Quick Win: "Full workflow"
- End-to-end test
- **Result:** Complete system working

---

## 📋 Implementation Order (Critical Path)

```
1. Fix TypeORM Entities (2h)
   ↓
2. Basic Repository (4h)
   ↓
3. Basic API Endpoints (3h)
   ↓
4. OBS Service (4h)
   ↓
5. Stage Controller (2h)
   ↓
6. Load Media Use Case (3h)
   ↓
7. Twitch Provider (4h)
   ↓
8. Command Handler (4h)
   ↓
9. Chat Service (2h)
   ↓
10. Polish & Test (5h)
```

**Total:** ~29 hours (1 week full-time, 2-3 weeks part-time)

---

## 🚨 Important Decisions

### 1. Skip Application Layer for MVP?
**Decision:** YES, for MVP
- Controllers can call repositories directly
- Add application layer later when refactoring
- **Why:** Faster to get working, can refactor later

### 2. Use DTOs in Domain?
**Decision:** Keep for now, fix later
- Current Playlist uses DTOs
- **Why:** Don't break what works, fix in Phase 2

### 3. Database Migrations?
**Decision:** Use TypeORM synchronize for MVP
- **Why:** Faster development
- **Later:** Add proper migrations

### 4. Testing Strategy?
**Decision:** Manual testing for MVP
- **Why:** Faster iteration
- **Later:** Add automated tests

---

## 📝 Daily Checklist Template

### Day 1-2: Data Layer
- [ ] Fix TypeORM entities
- [ ] Create MediaTitle repository
- [ ] Create Playlist repository
- [ ] Test with Postman

### Day 3-4: API Layer
- [ ] Create MediaTitle controller
- [ ] Create Playlist controller
- [ ] Test endpoints
- [ ] Connect MediaDiscovery to save to DB

### Day 5-7: OBS Integration
- [ ] Create OBS service
- [ ] Create Stage controller
- [ ] Test loading media
- [ ] Test play/pause

### Day 8-10: Chat Integration
- [ ] Create Twitch provider
- [ ] Create command handler
- [ ] Test commands
- [ ] Add more commands

### Day 11-14: Polish
- [ ] Error handling
- [ ] Configuration
- [ ] End-to-end testing
- [ ] Documentation

---

## 🎉 Success Criteria

**MVP is complete when:**
1. ✅ Can scan media files and store in database
2. ✅ Can retrieve media from API
3. ✅ Can load media into OBS via API
4. ✅ Can play/pause media via API
5. ✅ Can control playback via Twitch chat commands
6. ✅ Basic error handling works

**Then you can:**
- Stream with it!
- Add more features incrementally
- Refactor architecture later
- Add YouTube/Kick support

---

## 🔄 After MVP: Next Steps

1. **Add YouTube/Kick chat support**
2. **Improve architecture** (application layer, domain services)
3. **Add more chat commands** (!next, !previous, !queue)
4. **Add frontend** (React/Vue dashboard)
5. **Add authentication** (if needed)
6. **Add logging/monitoring**
7. **Add automated tests**

---

## 💡 Tips for Success

1. **Focus on one thing at a time** - Don't try to do everything
2. **Test frequently** - After each small change
3. **Keep it simple** - Don't over-engineer for MVP
4. **Document as you go** - Note what works/doesn't
5. **Celebrate small wins** - Each working feature is progress!

---

**Remember:** Perfect is the enemy of done. Get it working first, make it perfect later! 🚀

