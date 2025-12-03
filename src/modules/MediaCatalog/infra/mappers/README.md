# Mappers

This directory contains shared mapper utilities for converting between domain entities and persistence models.

## Purpose

Mappers eliminate code duplication when multiple repositories need to map the same entity. They are pure, stateless utility classes with static methods.

## Pattern

Each mapper follows this structure:

```typescript
export class EntityMapper {
  /**
   * Maps domain entity to TypeORM persistence entity
   */
  static toPersistence(domainEntity: DomainEntity): PersistenceEntity {
    // Mapping logic
  }

  /**
   * Maps TypeORM persistence entity to domain entity
   * Includes validation through domain entity factory methods
   */
  static fromPersistence(persistenceEntity: PersistenceEntity): DomainEntity {
    // Mapping logic with validation
  }
}
```

## Usage

Repositories import and use mappers:

```typescript
import { PlaylistMapper } from '../mappers/Playlist.mapper'

// In repository method
const entity = PlaylistMapper.toPersistence(domainPlaylist)
const domain = PlaylistMapper.fromPersistence(persistenceEntity)
```

## When to Create a Mapper

Create a mapper when:
- Multiple repositories need to map the same entity
- An aggregate root repository needs to map child entities
- You want to centralize mapping logic for maintainability

## Current Mappers

- `Playlist.mapper.ts` - Maps Playlist domain entity ↔ PlaylistEntity

