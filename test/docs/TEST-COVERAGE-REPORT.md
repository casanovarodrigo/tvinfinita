# Testing Plan - Media Catalog Module

**Created:** 2025-03-12  
**Status:** In Progress  
**Current Coverage:** ~75-80% of critical paths  
**Last Updated:** 2025-03-12

**Test Summary:**
- **Total Tests:** 107+ tests
- **E2E Tests:** 12 tests (2 test suites)
- **Integration Tests:** 40 tests (3 repositories)
- **Unit Tests:** 55+ tests (domain entities, value objects, services)
- **Test Suites:** 20 total (18 unit/integration + 2 E2E)

---

## 📊 Current Test Coverage Status

### ✅ Completed Tests

#### E2E Tests
- [x] `test/media-registration.e2e-spec.ts` (12 tests)
  - [x] GET /api/media/titles - empty list
  - [x] GET /api/media/titles - populated list structure
  - [x] GET /api/media/titles/:id - not found scenario
  - [x] GET /api/media/titles/:id - found scenario
  - [x] POST /api/media/register - endpoint structure
  - [x] POST /api/media/register - full registration flow with DB verification
  - [x] POST /api/media/register - empty available-titles.json handling
  - [x] GET /api/media/titles - data persistence verification
  - [x] GET /api/media/titles/:id - aggregate reconstruction verification
  - [x] Junction table verification - order maintenance

#### Integration Tests
- [x] `MediaTitle.repository.integration.spec.ts` (15 tests)
  - [x] createWithMedia() - full aggregate creation
  - [x] createWithMedia() - referential integrity (junction table)
  - [x] delete() - cascade deletion (aggregate boundary)
  - [x] Domain invariants - basePlaylist requirement
  - [x] findById() - complete aggregate loading
  - [x] findByTitle() - search by title (found and not found)
  - [x] findAll() - list all titles (empty and populated)
  - [x] update() - update MediaTitle title
  - [x] update() - update junction table entries
  - [x] Error handling - findById with non-existent ID
  - [x] Error handling - delete with non-existent ID
  - [x] Edge case - createWithMedia with empty array
  - [x] Transaction atomicity verification

- [x] `Playlist.repository.integration.spec.ts` (11 tests)
  - [x] findByMediaTitleId() - empty and populated scenarios
  - [x] findByMediaTitleId() - with junction relations
  - [x] findAnchorByMediaTitleId() - found and not found
  - [x] findAnchorByMediaTitleId() - with junction entries
  - [x] update() - update title
  - [x] update() - update junction entries order
  - [x] delete() - cascade delete junction entries
  - [x] deleteMany() - batch deletion
  - [x] deleteMany() - empty array handling

#### Unit Tests (Existing)
- [x] Domain entities (100% coverage)
- [x] Value objects (100% coverage)
- [x] MediaDiscovery.ts (89.38% coverage)

- [x] `TVShowMedia.repository.integration.spec.ts` (14 tests)
  - [x] create() - single creation
  - [x] createMany() - batch creation
  - [x] findById() - found and not found
  - [x] findByFilePath() - duplicate detection
  - [x] findAll() - empty and populated
  - [x] update() - update entity
  - [x] delete() - single deletion
  - [x] deleteMany() - batch deletion

### 📈 Coverage Metrics

| Component | Coverage | Status |
|-----------|----------|--------|
| MediaTitleRepository | ~85%+ | ✅ Good |
| PlaylistRepository | ~70%+ | ✅ Good |
| TVShowMediaRepository | ~85%+ | ✅ Good |
| MediaRegistrationController | ~80%+ | ✅ Good |
| PlaylistMapper | 94.11% | ✅ Good |
| MediaDiscovery | 89.38% | ✅ Good |

---

## 🎯 Next Priority Tests

### Priority 1: Critical Repository Methods (HIGH)

#### MediaTitleRepository - Missing Methods
- [x] `update()` - Update aggregate root
  - [x] Update title
  - [x] Update basePlaylist
  - [x] Transactional consistency
  - [x] Junction table updates

- [x] `findByTitle()` - Search by title
  - [x] Find existing title
  - [x] Return null for non-existent
  - [x] Load complete aggregate

- [x] `findAll()` - List all titles
  - [x] Return all titles
  - [x] Load complete aggregates
  - [x] Handle empty database

#### Error Handling & Edge Cases
- [x] `findById()` with non-existent ID
  - [x] Returns null (not throw)
  
- [x] `createWithMedia()` edge cases
  - [x] Empty TVShowMedia array
  - [ ] Invalid domain entities (deferred)
  - [x] Transaction atomicity verification

- [x] `delete()` edge cases
  - [x] Non-existent ID (should not throw)
  - [ ] Already deleted (idempotent) - covered by non-existent test

### Priority 2: PlaylistRepository Integration (MEDIUM)

- [x] `findByMediaTitleId()` - Load playlists for title
  - [x] Load with junction table relations (when relations loaded)
  - [x] Return empty array if none found
  - [x] Multiple playlists scenario

- [x] `findAnchorByMediaTitleId()` - Find base playlist
  - [x] Find anchor playlist
  - [x] Return null if not found
  - [x] Load with junction entries (when relations loaded)

- [x] `update()` - Update playlist
  - [x] Update title
  - [x] Update junction entries (order changes)
  - [x] Maintain referential integrity

- [x] `delete()` - Delete playlist
  - [x] Cascade delete junction entries
  - [x] TVShowMedia remains (not in boundary)

- [x] `deleteMany()` - Batch delete
  - [x] Delete multiple playlists
  - [x] Handle empty array gracefully

### Priority 3: E2E Tests with Real Data (MEDIUM)

- [x] Full registration flow
  - [x] POST /api/media/register → verify in DB
  - [x] GET /api/media/titles → verify response
  - [x] GET /api/media/titles/:id → verify complete data

- [x] Data persistence verification
  - [x] Verify junction table entries
  - [x] Verify aggregate reconstruction
  - [x] Verify DTO transformation
  - [x] Verify junction table order

### Priority 4: TVShowMediaRepository (LOW)

- [x] `createMany()` - Batch creation
  - [x] Create multiple entities
  - [x] Handle empty array

- [x] `deleteMany()` - Batch deletion
  - [x] Delete multiple entities
  - [x] Handle empty array

- [x] `findByFilePath()` - Duplicate detection
  - [x] Find existing by path
  - [x] Return null if not found

- [x] `create()` - Single creation
- [x] `findById()` - Find by ID (found and not found)
- [x] `findAll()` - List all (empty and populated)
- [x] `update()` - Update entity
- [x] `delete()` - Single deletion (with error handling)

---

## 📝 Testing Strategy

### Test Types Used
1. **E2E Tests** - Full stack, user-facing behavior
2. **Integration Tests** - Repository + Database, aggregate boundaries
3. **Unit Tests** - Domain logic (already covered)

### What We're NOT Testing (Early Development)
- ❌ Unit tests for controllers (too thin, change often)
- ❌ Unit tests for mappers (covered by repository tests)
- ❌ Mock-heavy tests (add later when behavior stabilizes)

### Test Organization
```
test/
  e2e/
    media-registration.e2e-spec.ts ✅

src/modules/MediaCatalog/infra/repositories/
  MediaTitle.repository.integration.spec.ts ✅
  Playlist.repository.integration.spec.ts ⏳ (next)
  TVShowMedia.repository.integration.spec.ts ⏳
```

---

## 🎯 Coverage Goals

### Phase 1: Critical Paths (Current)
- ✅ E2E endpoint structure
- ✅ Aggregate boundary integrity
- ✅ Transactional operations
- **Status:** ~75-80% coverage ✅

### Phase 2: Complete CRUD (Next)
- [ ] All repository methods
- [ ] Error handling
- [ ] Edge cases
- **Target:** ~50-60% coverage

### Phase 3: Full Integration (Future)
- [ ] Complete E2E flows
- [ ] Error scenarios
- [ ] Performance tests
- **Target:** ~70-80% coverage

---

## 📋 Test Checklist Template

When adding new tests, verify:
- [ ] Test covers critical business logic
- [ ] Test verifies aggregate boundaries (if applicable)
- [ ] Test handles error scenarios
- [ ] Test is not too brittle (won't break with refactoring)
- [ ] Test name clearly describes what it tests

---

## 🔄 Update Log

### 2025-03-12
- Created testing plan
- Documented current coverage status
- Identified priority tests
- Set coverage goals
- ✅ Completed Priority 1 tests:
  - Added findByTitle() tests
  - Added findAll() tests
  - Added update() tests
  - Added error handling tests
  - Coverage improved from ~30-40% to ~50-55%

- ✅ Completed Priority 2 tests:
  - Added PlaylistRepository integration tests (11 tests)
  - Added findByMediaTitleId() tests
  - Added findAnchorByMediaTitleId() tests
  - Added update() and delete() tests
  - Coverage improved from ~50-55% to ~60-65%

- ✅ Completed Priority 4 tests:
  - Added TVShowMediaRepository integration tests (14 tests)
  - Added createMany() and deleteMany() batch operations
  - Added findByFilePath() duplicate detection
  - Added full CRUD coverage (create, findById, findAll, update, delete)
  - Coverage improved from ~60-65% to ~70-75%

- ✅ Completed Priority 3 tests:
  - Enhanced E2E tests for MediaRegistrationController (12 tests total)
  - Added full registration flow verification with database persistence
  - Added data persistence verification (junction table, aggregate reconstruction)
  - Added DTO transformation verification
  - Added junction table order verification
  - **Total: 107 tests passing across 20 test suites (18 unit/integration + 2 E2E)**

---

## 📚 Notes

- **Early Development Focus:** Test critical paths, not everything
- **Aggregate Boundaries:** Always test transactional consistency
- **Error Handling:** Test happy path + common error scenarios
- **E2E Tests:** Use sparingly, focus on critical user flows
- **Integration Tests:** Primary testing method for repositories

---

## 🚀 Next Actions

**Priority 3: E2E Tests with Real Data (MEDIUM)**
1. Full registration flow with data verification
2. Data persistence verification
3. DTO transformation verification

**Priority 4: TVShowMediaRepository (LOW)**
1. Batch operations tests
2. findByFilePath() tests

**When to update this plan:**
- After completing priority tests
- When coverage goals are reached
- When new critical paths are identified
- When testing strategy changes

