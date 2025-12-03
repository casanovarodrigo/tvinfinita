# Technical Context

## Technology Stack

### Core Framework
- **NestJS** v9.0.0 - Node.js framework
- **TypeScript** v4.7.4 - Type-safe JavaScript
- **Node.js** - Runtime environment

### Database
- **PostgreSQL** - Relational database
- **TypeORM** v0.3.20 - ORM
- **@nestjs/typeorm** v10.0.2 - NestJS TypeORM integration

### Dependencies
- **ffmpeg** / **fluent-ffmpeg** - Video metadata extraction
- **obs-websocket-js** v5.0.3 - OBS WebSocket integration
- **joi** v17.9.1 - Configuration validation
- **uuid** v9.0.0 - Unique ID generation
- **rxjs** v7.2.0 - Reactive programming

### Development Tools
- **Jest** v29.3.1 - Testing framework
- **ESLint** v8.0.1 - Code linting
- **Prettier** v2.8.8 - Code formatting
- **Husky** v9.0.11 - Git hooks

## Development Setup

### Environment Variables
```env
POSTGRES_HOST=
POSTGRES_PORT=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
OBS_ADDRESS=
OBS_PORT=
OBS_PSWD=
```

### Scripts
- `npm run start:dev` - Development with watch mode
- `npm run test` - Run unit tests
- `npm run test:cov` - Test coverage
- `npm run lint` - Lint code
- `npm run build` - Build for production

## File Structure
```
src/
  application/          # App module and config
  ddd/                 # Domain primitives
  modules/              # Feature modules
    MediaCatalog/      # Media catalog domain
    Stage/             # OBS staging domain
```

## Path Aliases
- `#app/` → `src/application/`
- `#ddd/` → `src/ddd/`
- `#mediaCatalog/` → `src/modules/MediaCatalog/`

## Build Configuration
- Output: `dist/`
- Entry point: `dist/application/main.js`
- TypeScript compilation enabled
- Source maps enabled

