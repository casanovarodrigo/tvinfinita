# Understanding Services and Layers in DDD

**Date:** 2025-10-22  
**Question:** What's the difference between Domain Service, Infrastructure Service, and Use Case?

---

## TL;DR: The 3-Layer Architecture

```
┌─────────────────────────────────────┐
│    PRESENTATION/API LAYER          │
│  Controllers (HTTP, gRPC, etc.)    │
└────────────┬────────────────────────┘
             │ calls
             ▼
┌─────────────────────────────────────┐
│    APPLICATION LAYER               │
│  Use Cases (Orchestrate business)  │
└────────────┬────────────────────────┘
             │ depends on
             ▼
┌─────────────────────────────────────┐
│        DOMAIN LAYER                │
│  • Entities & Aggregates           │
│  • Value Objects                    │
│  • Domain Services (Pure logic)    │
│  • Repository Interfaces            │
└────────────┬────────────────────────┘
             │ implemented by
             ▼
┌─────────────────────────────────────┐
│    INFRASTRUCTURE LAYER            │
│  • Repository Implementations       │
│  • Infrastructure Services          │
│  • External APIs, DB, FileSystem    │
└─────────────────────────────────────┘
```

---

## 1. Domain Service

### What it is:
A **stateless** service that contains **domain logic** that doesn't naturally belong to an Entity or Value Object.

### Characteristics:
- ✅ **Domain logic only** - no infrastructure concerns
- ✅ **Stateless** - no instance variables (except dependencies)
- ✅ **Pure functions** - no side effects in the logic itself
- ✅ **Business rules** - encapsulates complex domain operations
- ✅ **Infrastructure-agnostic** - doesn't know about DB, HTTP, etc.

### When to use:
1. Logic belongs to **multiple aggregates**
2. Logic is a **business concept** but not part of any entity
3. Complex domain calculations or algorithms

### Example in your project:

**❌ WRONG (Current):**
```typescript
// src/modules/MediaCatalog/infra/repositories/MediaDiscovery/MediaDiscovery.ts

export class MediaDiscoveryClass {
  constructor(
    storageFolderPath: string,  // ❌ File system path
    availableTitlesFile: string   // ❌ Infrastructure concern
  ) {}
  
  public async registerTitles() {
    const unvalidatedFile = await fs.promises.readFile(...)  // ❌ File operations
    const list = JSON.parse(unvalidatedFile)  // ❌ JSON parsing
    // ... domain logic mixed with infrastructure
  }
}
```

**✅ CORRECT (Domain Service):**
```typescript
// src/modules/MediaCatalog/domain/services/MediaDiscovery.service.ts

import { MediaTitle } from '../entities/MediaTitle'
import { Playlist } from '../entities/Playlist'
import { TVShowMedia } from '../entities/TVShowMedia'

/**
 * Pure domain service - contains business logic for discovering media
 * This service has NO knowledge of:
 * - File system
 * - Database
 * - HTTP
 * - External APIs
 * 
 * It only contains BUSINESS LOGIC
 */
export class MediaDiscoveryService {
  /**
   * Discover media title structure from raw file information
   * This is DOMAIN LOGIC - understanding how media is organized
   */
  public async discoverMediaTitle(
    titleName: string,
    rawMediaFiles: RawMediaFile[]  // Data structure, not file system
  ): Result<MediaTitle> {
    // 1. Group files by season (domain logic)
    const seasons = this.groupBySeason(rawMediaFiles)
    
    // 2. Validate structure (domain rules)
    if (seasons.length === 0) {
      return Result.fail(new Error('No seasons found'))
    }
    
    // 3. Create submedia entities (domain logic)
    const submedia = seasons.flatMap(season =>
      season.files.map(file => TVShowMedia.create(file).result)
    )
    
    // 4. Validate ordering (domain rule)
    const isOrdered = this.validateOrder(submedia)
    if (!isOrdered) {
      return Result.fail(new Error('Files not properly ordered'))
    }
    
    // 5. Create playlist (domain logic)
    const playlistResult = Playlist.create({
      title: `${titleName} - Base Playlist`,
      submedia,
      isAnchor: true,
      mediaTitleId: null
    })
    
    if (playlistResult.isFailure) {
      return Result.fail(playlistResult.error)
    }
    
    // 6. Create media title (domain logic)
    return MediaTitle.create(titleName, playlistResult.result, 'tvshow')
  }
  
  /**
   * Domain logic for grouping files
   * This is how the BUSINESS understands seasons
   */
  private groupBySeason(files: RawMediaFile[]): Season[] {
    // Pure domain logic - no file system access
    const seasonMap = new Map<string, RawMediaFile[]>()
    
    files.forEach(file => {
      const seasonKey = file.folderName // Business understands folders as seasons
      if (!seasonMap.has(seasonKey)) {
        seasonMap.set(seasonKey, [])
      }
      seasonMap.get(seasonKey).push(file)
    })
    
    return Array.from(seasonMap.entries()).map(([name, files]) => ({
      name,
      files: files.sort((a, b) => a.episodeNumber - b.episodeNumber) // Business ordering
    }))
  }
  
  private validateOrder(submedia: TVShowMedia[]): boolean {
    // Domain rule: episodes must be in order
    for (let i = 1; i < submedia.length; i++) {
      if (submedia[i].episodeNumber <= submedia[i-1].episodeNumber) {
        return false
      }
    }
    return true
  }
}
```

### Key Points:
- ❌ NO file system operations (that's infrastructure)
- ❌ NO database calls (that's infrastructure)
- ❌ NO HTTP requests (that's infrastructure)
- ✅ ONLY business logic and rules
- ✅ Works with domain entities and value objects
- ✅ Can be tested without mocking infrastructure

---

## 2. Infrastructure Service

### What it is:
A service that handles **technical concerns** like file system, database, HTTP, external APIs, etc.

### Characteristics:
- ⚠️ **Technical implementation** - HOW things are done
- ⚠️ **Infrastructure-specific** - uses frameworks, libraries
- ⚠️ **Side effects** - reads/writes to external systems
- ⚠️ **Framework-dependent** - TypeORM, AWS S3, etc.

### When to use:
1. Interacting with external systems
2. File system operations
3. Database operations (outside repositories)
4. Third-party API calls
5. Cache management
6. Email sending, etc.

### Example in your project:

```typescript
// src/modules/MediaCatalog/infra/services/FileSystem.service.ts

import * as fs from 'fs'
import { promisify } from 'util'

/**
 * Infrastructure service - handles file system operations
 * This service knows HOW to access files (the mechanism)
 */
export class FileSystemService implements IFileSystemRepository {
  
  async readFile(path: string): Promise<string> {
    try {
      return await fs.promises.readFile(path, 'utf8')
    } catch (error) {
      throw new Error(`Failed to read file: ${path}`)
    }
  }
  
  async readDirectory(path: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(path)
    } catch (error) {
      throw new Error(`Failed to read directory: ${path}`)
    }
  }
  
  async exists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path)
      return true
    } catch {
      return false
    }
  }
}
```

```typescript
// src/modules/MediaCatalog/infra/services/VideoMetadata.service.ts

import ffmpeg from 'fluent-ffmpeg'

/**
 * Infrastructure service - knows HOW to extract video metadata
 * This is infrastructure because it:
 * - Uses ffmpeg (external library)
 * - Interacts with video files (file system)
 * - Returns raw technical data
 */
export class VideoMetadataService {
  async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    // Uses ffmpeg (infrastructure library)
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err)
        else resolve({
          duration: metadata.format.duration,
          width: metadata.streams[0].width,
          height: metadata.streams[0].height,
          bitrate: metadata.format.bit_rate
        })
      })
    })
  }
}
```

### Key Points:
- ⚠️ Knows HOW to do things (technical)
- ⚠️ Framework/library dependent
- ⚠️ Has side effects (I/O operations)
- ⚠️ Can be swapped with different implementation
- ✅ Implements interfaces defined in domain layer

---

## 3. Use Case (Application Service)

### What it is:
Orchestrates **application logic** by coordinating domain services, repositories, and infrastructure services to fulfill a specific business goal.

### Characteristics:
- ✅ **Transaction boundaries** - manages transactions
- ✅ **Orchestration** - coordinates multiple operations
- ✅ **Application logic** - workflows and processes
- ✅ **Depends on domain** - uses domain services and entities
- ✅ **Depends on infrastructure** - uses infrastructure services

### When to use:
1. **User interactions** - what the user wants to accomplish
2. **Transaction orchestration** - coordinating multiple operations
3. **Application workflows** - business processes

### Example in your project:

**❌ WRONG (Current):**
```typescript
@Controller('discovery')
export class MediaDiscoveryController {
  // ❌ Controller directly doing all the work
  @Post('/scan')
  async scan() {
    // File operations (infrastructure)
    const files = await fs.promises.readdir(path)
    
    // Domain logic (should be in domain service)
    const grouped = this.groupBySeason(files)
    
    // Database operations (infrastructure)
    await this.mediaTitleRepo.save(...)
  }
}
```

**✅ CORRECT (Use Case Pattern):**
```typescript
// src/modules/MediaCatalog/application/use-cases/DiscoverMediaTitles.use-case.ts

import { UseCase } from '#ddd/primitives/use-case'
import { MediaTitle } from '#mediaCatalog/domain/entities/MediaTitle'
import { MediaDiscoveryService } from '#mediaCatalog/domain/services/MediaDiscovery.service'
import { IMediaTitleRepository } from '#mediaCatalog/domain/repositories/IMediaTitle.repository'

export interface DiscoverMediaTitlesRequest {
  storagePath: string
  availableTitlesFile: string
}

export interface DiscoverMediaTitlesResponse {
  discoveredTitles: Array<{
    id: string
    title: string
    type: 'tvshow' | 'movie'
  }>
}

/**
 * USE CASE: Orchestrates the discovery workflow
 * 
 * This is NOT domain logic, but APPLICATION logic:
 * - Coordinates multiple services
 * - Manages transactions
 * - Handles errors
 * - Knows the workflow
 */
export class DiscoverMediaTitlesUseCase implements UseCase<DiscoverMediaTitlesRequest, DiscoverMediaTitlesResponse> {
  
  constructor(
    // Domain service - contains business logic
    private mediaDiscoveryService: MediaDiscoveryService,
    
    // Infrastructure services - know HOW to access data
    private fileSystemService: IFileSystemRepository,
    private videoMetadataService: IVideoMetadataService,
    
    // Repository - data access
    private mediaTitleRepository: IMediaTitleRepository
  ) {}
  
  async execute(request: DiscoverMediaTitlesRequest): Promise<DiscoverMediaTitlesResponse> {
    try {
      // 1. Infrastructure: Read configuration file
      const titlesConfig = await this.fileSystemService.readFile(
        `${request.storagePath}/${request.availableTitlesFile}`
      )
      const titlesList: IAvailableTitle[] = JSON.parse(titlesConfig)
      
      const discoveredTitles = []
      
      // 2. For each title: orchestrate discovery workflow
      for (const titleConfig of titlesList) {
        // 2a. Infrastructure: Read files from disk
        const rawFiles = await this.readFilesFromDisk(titleConfig.path)
        
        // 2b. Infrastructure: Extract video metadata
        const filesWithMetadata = await Promise.all(
          rawFiles.map(async file => {
            const metadata = await this.videoMetadataService.getVideoMetadata(file.path)
            return { ...file, ...metadata }
          })
        )
        
        // 2c. Domain: Apply domain logic to discover structure
        const mediaTitleResult = await this.mediaDiscoveryService.discoverMediaTitle(
          titleConfig.name,
          filesWithMetadata
        )
        
        if (mediaTitleResult.isFailure) {
          console.error(`Failed to discover ${titleConfig.name}:`, mediaTitleResult.error)
          continue
        }
        
        // 2d. Infrastructure: Save to database
        await this.mediaTitleRepository.save(mediaTitleResult.result)
        
        discoveredTitles.push({
          id: mediaTitleResult.result.id.value,
          title: titleConfig.name,
          type: titleConfig.type
        })
      }
      
      return { discoveredTitles }
      
    } catch (error) {
      throw new Error(`Discovery failed: ${error.message}`)
    }
  }
  
  private async readFilesFromDisk(path: string): Promise<RawMediaFile[]> {
    // Infrastructure service call
    const folders = await this.fileSystemService.readDirectory(path)
    
    const files: RawMediaFile[] = []
    for (const folder of folders) {
      const folderPath = `${path}/${folder}`
      const folderFiles = await this.fileSystemService.readDirectory(folderPath)
      
      for (const fileName of folderFiles) {
        files.push({
          folderName: folder,
          fileName,
          path: folderPath
        })
      }
    }
    
    return files
  }
}
```

```typescript
// Controller now just delegates to use case

@Controller('discovery')
export class MediaDiscoveryController {
  constructor(private discoverUseCase: DiscoverMediaTitlesUseCase) {}
  
  @Post('/scan')
  async scan(@Body() request: DiscoverMediaTitlesRequest): Promise<DiscoverMediaTitlesResponse> {
    return this.discoverUseCase.execute(request)
  }
}
```

### Key Points:
- ✅ **Orchestrates** multiple operations
- ✅ **Knows the workflow** - step 1, 2, 3...
- ✅ **Depends on both** domain and infrastructure
- ✅ **Transaction management** - all or nothing
- ✅ **Error handling** - business error vs technical error
- ✅ **Application-specific** - not reusable across apps

---

## 4. The Complete Flow

Let's trace through a real example:

### Example: "Discover a new TV show"

```
┌──────────────────────────────────────────────────────────────┐
│ CONTROLLER (Presentation Layer)                             │
│                                                              │
│ POST /discovery/scan                                         │
│ - Receives HTTP request                                      │
│ - Validates DTO                                             │
│ - Calls Use Case                                            │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ USE CASE (Application Layer)                                │
│                                                              │
│ DiscoverMediaTitlesUseCase                                   │
│ 1. Reads file from disk (calls Infrastructure)               │
│ 2. Extracts metadata (calls Infrastructure)                 │
│ 3. Discovers structure (calls Domain)                       │
│ 4. Saves to database (calls Repository)                    │
└──────────────────┬───────────────────────────────────────────┘
                   │ (Depends on)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ DOMAIN SERVICE (Domain Layer)                                │
│                                                              │
│ MediaDiscoveryService                                        │
│ - Groups files by season (business rule)                     │
│ - Validates ordering (business rule)                        │
│ - Creates domain entities                                    │
│ - Returns Result<MediaTitle>                                 │
│                                                              │
│ PURE BUSINESS LOGIC - NO INFRASTRUCTURE                     │
└──────────────────┬───────────────────────────────────────────┘
                   │ (Used by)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE SERVICES (Infrastructure Layer)            │
│                                                              │
│ - FileSystemService.readFile()                               │
│ - VideoMetadataService.getMetadata()                         │
│ - MediaTitleRepository.save()                                │
│                                                              │
│ TECHNICAL IMPLEMENTATIONS                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Key Differences Summary

| Aspect | Domain Service | Use Case | Infrastructure Service |
|--------|---------------|----------|------------------------|
| **Purpose** | Business logic | Workflow orchestration | Technical implementation |
| **Knows** | WHAT the business means | HOW to complete a goal | HOW to use technology |
| **Dependencies** | Domain entities only | Domain + Infrastructure | Frameworks/Libraries |
| **Side Effects** | No (pure logic) | Yes (coordinates) | Yes (I/O) |
| **Reusable** | Across apps | App-specific | Can be swapped |
| **Testing** | Pure unit tests | Integration tests | Mock dependencies |
| **Changes** | Business rules | User needs | Technology choice |

---

## 6. Answering Your Specific Question

> "Is an infrastructure service the equivalent or the same as a use case?"

### Answer: ❌ **NO, they are COMPLETELY different:**

| Infrastructure Service | Use Case |
|------------------------|----------|
| **Knows HOW** to do technical things | **Orchestrates** what to do |
| Single technical capability | Multi-step workflow |
| Example: Read file from disk | Example: Process uploaded file, validate, save, send email |
| Reusable across use cases | Application-specific |
| Implements `IFileSystemRepository` interface | Implements `UseCase` interface |

### They Work Together:

```typescript
class CreateMediaTitleUseCase {  // ← Use Case
  constructor(
    private fileService: FileSystemService,      // ← Infrastructure Service
    private videoService: VideoMetadataService,   // ← Infrastructure Service
    private mediaRepo: MediaTitleRepository      // ← Infrastructure (Repository)
  ) {}
  
  async execute() {
    // Use infrastructure services to orchestrate workflow
    const data = await this.fileService.readFile(...)      // HOW
    const metadata = await this.videoService.get(...)     // HOW
    // ... orchestration logic (WHAT in what order)          // Use Case logic
    await this.mediaRepo.save(...)                          // HOW
  }
}
```

### **Separation in your Project:**

```
✅ CORRECT:
application/
  use-cases/              ← Application orchestration
domain/
  services/               ← Pure business logic
infra/
  services/              ← Technical implementation
  repositories/          ← Data access

❌ WRONG (Current):
infra/
  repositories/MediaDiscovery/  ← Mixing everything!
```

---

## 7. Practical Implementation for Your Project

### Step 1: Create Domain Service
**File:** `src/modules/MediaCatalog/domain/services/MediaDiscovery.service.ts`
```typescript
export class MediaDiscoveryService {
  // Pure business logic
  discoverMediaTitle(titleName: string, files: RawFile[]): Result<MediaTitle>
  groupBySeason(files: RawFile[]): Season[]
  validateStructure(seasons: Season[]): Result<void>
}
```

### Step 2: Create Infrastructure Services
**File:** `src/modules/MediaCatalog/infra/services/FileSystem.service.ts`
```typescript
export class FileSystemService {
  readFile(path: string): Promise<string>
  readDirectory(path: string): Promise<string[]>
  exists(path: string): Promise<boolean>
}
```

### Step 3: Create Use Case
**File:** `src/modules/MediaCatalog/application/use-cases/DiscoverTitles.use-case.ts`
```typescript
export class DiscoverTitlesUseCase {
  constructor(
    private fileSystem: FileSystemService,
    private discovery: MediaDiscoveryService,
    private mediaRepo: IMediaTitleRepository
  ) {}
  
  async execute(request): Promise<Response> {
    // Orchestrate the workflow
  }
}
```

---

## Conclusion

- **Domain Service** = Pure business logic, no infrastructure
- **Infrastructure Service** = Technical HOW (file system, HTTP, etc.)
- **Use Case** = Orchestrates workflow, coordinates services

They are **not the same** - they work **together** in a layered architecture! 🏗️


