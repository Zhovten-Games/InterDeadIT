# D1 schema

The Worker persists profiles to the `profiles` table in the D1 database bound as `INTERDEAD_CORE`.

## Table: `profiles`

The Worker expects the following columns:

- `profile_id` (primary key)
- `data` (JSON payload with identity and metadata)
- `last_cleanup_at`
- `last_cleanup_timezone`
- `delete_count`

`persistProfile` inserts or updates these fields on each login or cleanup operation.
