# Releasing Wellbeing

This checklist is the single source of truth for creating production releases.

## Prerequisites

- You are on `main` and local changes are committed.
- CI is green on `main`.
- Version is updated in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`
- Changelog/release notes context is ready.

## Required GitHub Secrets

Set these repository secrets before releasing:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Without these, release build jobs will fail by design.

## Release Triggers

Release workflow: `.github/workflows/release.yml`

It can be triggered by either:

1. Pushing a tag matching `v*` (recommended), or
2. Manual `workflow_dispatch`.

Recommended tag flow:

```bash
git checkout main
git pull --ff-only
git tag v0.2.1
git push origin v0.2.1
```

## What the Release Workflow Enforces

Before creating a release draft, `quality-gates` runs:

- `npm run lint`
- `npm run typecheck`
- `npm run test:run`
- `npm run test:e2e`
- `npm run audit:prod`
- `cargo test --all-features` (in `src-tauri`)
- `cargo audit`

If any gate fails, no release draft is created.

## Build and Publish Flow

After quality gates pass:

1. Draft GitHub release is created.
2. Linux and Windows Tauri artifacts are built and uploaded.
3. Arch package is built and uploaded.
4. Integrity artifacts are generated and attached:
   - `SHA256SUMS.txt`
   - `sbom.spdx.json`
5. Draft release is published.

## Expected Release Assets

You should see platform bundles such as:

- Linux: `.deb`, `.rpm`, `.AppImage`
- Windows: `.exe` (NSIS)
- Arch: `.pkg.tar.zst`
- Integrity: `SHA256SUMS.txt`, `sbom.spdx.json`

## Post-Release Verification

- Download at least one artifact per platform.
- Verify checksums locally:

```bash
sha256sum -c SHA256SUMS.txt
```

- Install and smoke test:
  - app launch
  - dashboard load
  - settings load
  - update check

## Rollback / Recovery

If a bad release is published:

1. Mark the GitHub release as pre-release or remove release notes visibility.
2. If needed, delete the release and tag:
   - Delete release in GitHub UI
   - Delete tag locally/remotely:

```bash
git tag -d v0.2.1
git push origin :refs/tags/v0.2.1
```

3. Prepare a fixed patch release (for example `v0.2.2`). Do not reuse a deleted tag name.

## Troubleshooting

- Missing signing secrets: release build fails early with explicit error.
- E2E failures on release: run `npm run test:e2e` locally and update flaky selectors before retagging.
- Rust advisory failures: run `cargo audit --manifest-path src-tauri/Cargo.toml` locally, patch dependencies, retag.
