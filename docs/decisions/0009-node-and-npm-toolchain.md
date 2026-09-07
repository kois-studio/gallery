# ADR 0009: Node 24 LTS and npm application lockfiles

- **Status:** Accepted
- **Date:** 2026-09-06
- **Supersedes:** None

## Context

Gallery contains an Angular application, a NestJS application, a separate landing application, native image/database dependencies, and a Docker distribution. The toolchain must be reproducible without introducing workspace machinery that does not solve a current problem.

## Decision

Gallery uses:

- Node.js 24 LTS as the supported runtime and development major;
- Angular 22 and NestJS 12 as the initial framework majors, kept aligned with their official compatibility requirements;
- npm 11 as the package manager;
- no npm workspaces initially;
- one `package.json` and one `package-lock.json` per application (`apps/web`, `apps/api`, and later `landing`); and
- root scripts that invoke each application with `npm --prefix` or an equivalent explicit command.

The repository pins the tested Node patch in its tool-version file and Docker image. CI and deployment use `npm ci`; manifests and lockfiles must remain synchronized. Dependencies are installed independently for each application, which keeps Angular, NestJS, Sharp, and native SQLite resolution visible and avoids creating a shared dependency graph before a real shared package exists.

## Consequences

This matches the existing Board Vault operating model and keeps local commands understandable. It means cross-application dependency sharing is explicit rather than automatic. If a real shared package or coordinated task graph appears, npm workspaces or another orchestrator can be introduced through a new decision.

Node 24 was selected because it is an LTS line with a longer runway than Node 22 and satisfies the Angular 22 and NestJS CLI requirements. The exact patch is a reproducibility control, not a permanent refusal to receive security patches.

## Alternatives considered

- **pnpm workspaces:** deferred because Gallery has no shared package or workspace-level linking requirement yet.
- **Bun:** rejected for the first release because the project has native dependencies and the existing team/deployment convention is npm.
- **Node 22 LTS:** viable, but gives Gallery a shorter remaining support runway at the time of this decision.
