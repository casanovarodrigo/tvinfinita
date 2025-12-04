# User Memories

## Custom Commands
- **mfs**: `php artisan migrate:fresh --seed` - Resets database and runs all migrations with seeders

## Preferences
- Use individual line edits for small unrelated changes
- Use MultiEdit for related changes in same logical unit
- Default for untreated cases is individual line edits

## Reminders
- DO NOT commit without prompting the user
- NEVER commit without being asked to
- Check TODO comments and remove when implemented
- When asked "do you understand", don't apply changes - just answer

## Legacy Project Reference
- The `legacy-project` folder in the project root contains the legacy MVP project (vcmanda) used as a reference for implementation patterns and behavior
- When the user mentions "legacy project" or asks to check legacy implementation, always refer to the `legacy-project` folder in the current project root
- This folder is excluded from TypeScript compilation, ESLint, and git tracking
- The legacy project is the source of truth for understanding how features were implemented in the original MVP

