# System Patterns

## Domain-Driven Design Structure

### Modules
1. **MediaCatalog**: Core media management
   - Aggregates: MediaTitle
   - Entities: Playlist, TVShowMedia
   - Value Objects: Title, FileName, FilePath, etc.

2. **Stage**: OBS integration and staging
   - Entities: Director
   - Singletons: OBSSocket

## Entity Relationships

```
MediaTitle (AggregateRoot)
  ├── basePlaylist: Playlist
  └── type: 'tvshow' | 'movie'

Playlist (Entity)
  ├── submediaMap: Map<number, TVShowMedia>
  ├── collectionsMap?: Map<number, Collection>
  ├── title: string
  └── isAnchor: boolean

TVShowMedia (Entity)
  ├── fileName: FileNameValueObject
  ├── filePath: FilePathValueObject
  ├── title: TitleValueObject
  ├── duration: MediaDurationValueObject
  ├── width: MediaWidthValueObject
  ├── height: MediaHeightValueObject
  └── ratio: string
```

## Key Patterns

### Factory Pattern
- Static `create()` methods for entity instantiation
- Returns Result<T> for validation
- All validation happens in factory

### Value Object Pattern
- Immutable objects wrapping primitives
- Validation in constructor
- Return Result<T> on creation

### Repository Pattern
- Data access abstraction
- Domain entities only, no infrastructure concerns
- Separation of concerns

### Result Pattern
- Functional error handling
- Result<T> with isSuccess/isFailure
- Combine multiple results
- Avoid throwing exceptions where possible

## Module Pattern
- Feature modules (MediaCatalog, Stage)
- Each module has domain/ and infra/
- Controllers expose HTTP endpoints
- Repositories handle data access

