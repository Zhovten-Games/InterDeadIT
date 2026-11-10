# Poll-profile interoperability

The [versioned public contract](https://github.com/Zhovten-Games/InterDeadReferenceLibrary/blob/main/standards/interop/poll-progress-v1.md) defines the local completion projection and player-data wrapper. Website and game consume the same production module and known poll IDs. Imports grant completion marks only; connected identity, scoring and native gameplay keep their existing authority.

Website: `HUGO_INTERDEAD_AUTH_ENABLED=false` selects local answers, replay protection, export and import in the existing profile cards. The game offers optional import before first Start and retains the controls in Settings. Download player data includes the exact native save and completion flags; Download save preserves the native-only format. A website-only file changes completion flags without restoring a game session.

Storage key: `interdead.poll-profile.v1`. Invalid/corrupt files preserve current data; unavailable storage has an explicit temporary status and a download path. Re-enabling site authorization preserves its remote service boundary and performs no automatic local-to-account upload. Imports are idempotent and preserve existing local answers.

Run the repository WARDEN. Browser-independent protocol cases exercise real production modules; UI, native, WASM and physical browser checks retain their declared scope and outcomes.
