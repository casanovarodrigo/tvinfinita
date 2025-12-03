# Active Context

## Current Focus
Working on MediaCatalog module - Playlist and TVShowMedia entities with domain-driven design patterns.

## Recent Changes
- Modified Playlist entity to use Map-based structure for submedia
- Added ICollection interface for playlist collections
- Updated TVShowMedia entity with complete value objects
- Created MediaCatalog module with controller
- Set up PostgreSQL module with TypeORM
- Added Playlist static factory methods

## Pending Work (from TO-DO.md)
- [ ] Complete value objects implementation
- [ ] Finish Playlist entity refactoring
- [ ] MediaTitle - SubMedia ordering logic
- [ ] SubMedia to SubMediaEntity conversion
- [ ] Study Either/Result pattern usage

## Pending Work (from TO-DO-NEXT.md)
- [ ] MediaDiscovery improvements
  - Create test subfolder in storage
  - Remove createLocalRepositoryFolders from constructor
  - Update tests
- [ ] Separate MediaDiscovery to own module
- [ ] Use MediaCatalog for frontend management
- [ ] Playlist creation with drag-and-drop ordering

## Current State
- Module structure established
- Core domain entities defined
- Infrastructure layer started
- Database configured
- Tests partially written

## Active Decisions
- Using Map<number, T> for ordered collections in Playlists
- Static factory methods over constructors
- Result pattern for error handling
- Value objects for all domain validation

## Next Steps
1. Complete Playlist entity tests
2. Implement MediaTitle ordering logic
3. Refactor MediaDiscovery repository
4. Add OBS integration endpoints

## Blockers
- None currently identified

