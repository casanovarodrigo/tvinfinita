# Technical Guidelines

## Architecture
- **DDD (Domain-Driven Design)** with clear boundaries
- **Layered Architecture**: Domain → Infrastructure → Application
- **Result Pattern**: Functional error handling (Result<T>)
- **Value Objects**: Immutable validated primitives

## Domain Structure
```
src/
  ddd/                    # Domain primitives
  modules/
    MediaCatalog/        # Media catalog domain
      domain/
        entities/        # Aggregate roots and entities
        value-objects/   # Value objects
      infra/
        controllers/     # HTTP controllers
        repositories/    # Data access
        entities/        # TypeORM entities
    Stage/               # OBS staging domain
      domain/
        entities/
      infra/
        singletons/
```

## Entity Hierarchy
- **AggregateRoot**: MediaTitle (top-level aggregates)
- **Entity**: Playlist, TVShowMedia, Director (domain entities)
- **DomainEntity**: Base interface with id, timestamps, soft delete
- **Value Objects**: Title, FileName, FilePath, FileExtension, MediaDuration, etc.

## Code Patterns
- Use static factory methods for entity creation
- No setters - entities are immutable
- DTO pattern for data transfer
- Result pattern for operations (Result<T>)
- Map-based ordering for playlists

## Validation
- Value objects handle all validation
- Use Result.combine() for multiple validations
- Throw BaseError on validation failure

## Database
- PostgreSQL with TypeORM
- Synchronize enabled (development)
- Entity files: *.entity.ts in infra/entities/

## External Integrations
- **ffmpeg**: Video metadata extraction
- **OBS WebSocket**: Broadcasting control
- **File System**: Local media discovery

