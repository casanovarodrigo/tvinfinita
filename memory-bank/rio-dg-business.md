# Business Rules & Domain Guidelines

## Media Types
- **TV Shows**: Multi-episode content organized in seasons
- **Movies**: Single-file content
- **Collections**: Grouped content (future feature)

## Media Organization
- MediaTitle is the aggregate root (TV show or movie)
- Each MediaTitle has a base Playlist (default ordering)
- Playlists contain SubMedia (TVShowMedia or MovieMedia)
- Collections belong within Playlists
- SubMedia ordered alphabetically by default (like filesystem)

## Playlist Rules
- Anchor playlist: Base default playlist for a MediaTitle
- Custom playlists: User-created playlists
- Collections: Grouped submedia within playlists
- Ordering: Uses Map structure with numeric indices

## Media Discovery
- Scans directories recursively
- Filters allowed formats: avi, mkv, mp4
- Filters prohibited formats: srt (subtitles)
- Uses file order for default playlist ordering
- Extracts metadata: duration, resolution, aspect ratio

## Stage Module
- OBS WebSocket integration
- Director entity for managing staged content
- Handles media playback control

