# Repository Guidelines

## Project Structure & Module Organization

Midday is a Bun/Turborepo monorepo. Application entry points live in `apps/`: `dashboard` and `website` are Next.js apps, `api` is a Bun/Hono service, `engine` is a Cloudflare Worker, `desktop` is a Vite/Tauri app, and `docs` is the Mintlify site. Shared code lives in `packages/`, with UI primitives in `packages/ui/src`, database utilities and migrations in `packages/db`, email templates in `packages/email`, background jobs in `packages/jobs`, and domain libraries such as `invoice`, `inbox`, `documents`, and `utils`. Tests usually sit next to source files as `*.test.ts`; database tests are under `packages/db/src/test`.

## Build, Test, and Development Commands

Use Bun, matching `packageManager: bun@1.2.22`.

- `bun install`: install workspace dependencies.
- `bun run dev`: run all Turbo `dev` tasks in parallel.
- `bun run dev:dashboard`, `bun run dev:api`, `bun run dev:engine`, `bun run dev:website`: run one app locally.
- `bun run build`: build all packages and apps through Turbo.
- `bun run lint`: run package linters and `manypkg check`.
- `bun run typecheck`: run TypeScript checks across workspaces.
- `bun run test`: run Turbo test tasks; use `bun test path/to/file.test.ts` for focused Bun tests.

## Coding Style & Naming Conventions

TypeScript and React are the default. Biome controls formatting and imports; run `bun run format` before broad edits and `biome check .` in touched packages when possible. Formatting uses spaces. Keep package exports and imports on existing `@midday/*` workspace aliases. Name React components in PascalCase, hooks as `useThing`, tests as `thing.test.ts`, and keep shared UI components in kebab-case files like `date-range-picker.tsx`.

## Testing Guidelines

Prefer focused unit tests beside the code being changed. Most workspaces use Bun's test runner; `packages/categories` uses Jest. Add or update tests for business logic, transformations, database utilities, and bug fixes. Snapshot tests already exist for engine provider transforms; update snapshots only when the expected provider output intentionally changes.

## Commit & Pull Request Guidelines

Recent commits are short, imperative or topic-style summaries, sometimes with PR numbers, for example `Feature/filter dropdown (#660)` or `border`. Keep commits focused and mention the affected area when useful. Pull requests should include a concise description, linked issues, test results, and screenshots or screen recordings for UI changes.

## Security & Configuration

Do not commit secrets. Use the existing env templates such as `apps/dashboard/.env-example`, `apps/api/.env-template`, `apps/website/.env-template`, and `packages/jobs/.env-template`. Turbo treats `.env` as a global dependency, so environment changes can affect builds.
