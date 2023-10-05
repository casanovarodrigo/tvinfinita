- object values -> determine which and create them
- - title - done?
- - fileExtensions - done?
- - duration - timestamp - done?
- - fileName - done?
- - filePath? - done?


- Playlist entity -> change submedia simple object to SubMediaEntity
- - collections belong inside a PLAYLIST for now
- - make a static create method to factory playlist (get rid off of setters)


- MediaTitle is made of
- - SubMedia ordered alphabetically asc by default just like folders and files (using it in my advantage)
- - Playlists - Default playlist is using above logic



- MediaTitle is an AggregateRoot
- SubMedia is an Entity
- Playlist is an Entity


- MediaTitle
- - creates SubMedia
- - use file order to set SubMedia order in its own table
- - - on rebuild checks if its default MediaTitle's Playlist or a specific one









- study either, mapLeft/Right, composeFromPredicate
- - not using these cause it looks more function oriented
- - it sounds good to have typescript error handling but in
- - implementation is impractical with high quantities of validation in a row