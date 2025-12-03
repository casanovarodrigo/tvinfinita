# Product Context: TV Infinita

## Problem Statement
Managing large collections of media files (TV shows, movies) requires:
- Manual organization and cataloging
- Metadata extraction for video files
- Playlist creation and ordering
- Integration with broadcasting software (OBS)

## Solution
An automated media catalog system that:
- Scans local directories for media files
- Extracts video metadata using ffmpeg
- Organizes content into structured playlists
- Integrates with OBS for staging and playback

## User Experience Goals
1. **Automated Discovery**: Point to media directories and let the system catalog everything
2. **Flexible Organization**: Create custom playlists with drag-and-drop ordering
3. **Seamless Staging**: Direct integration with OBS for broadcasting workflows
4. **Metadata Rich**: Track all video properties (duration, resolution, format)

## Current State
- In development - core domain entities established
- Value objects implemented for validation
- Media discovery pipeline partially implemented
- OBS integration scaffold created
- Database persistence layer configured

