---
title: HTTP API
description: Local bridge routes, capability scopes, version checks and snapshot upload semantics.
---

The standalone bridge defaults to `127.0.0.1:4747`; Nudge dev selects a
free loopback port. All data routes require
`Authorization: Bearer …`; keep the actual capability in a secret local configuration,
never in a URL. Browser requests also require an exact allowed Origin. The separate
MCP capability is used on server-to-server requests without browser Origin.

Managed agents communicate with the runner through ACP, not through these HTTP
routes directly. The runner uses its own capability for the dedicated job routes.

## Routes

| Method | Path                                      | Capability / behavior                                       |
| ------ | ----------------------------------------- | ----------------------------------------------------------- |
| GET    | `/health`                                 | Liveness only; no private state.                            |
| GET    | `/api/v1/annotations?status=queued`       | Read this project's annotations; optional state filter.     |
| POST   | `/api/v1/annotations`                     | Browser creates `{ comment, anchor }`.                      |
| GET    | `/api/v1/annotations/:id`                 | Read one annotation and its revisions.                      |
| POST   | `/api/v1/annotations/:id/claim`           | MCP: queued → in progress.                                  |
| POST   | `/api/v1/annotations/:id/release`         | MCP: in progress → queued.                                  |
| POST   | `/api/v1/annotations/:id/implementation`  | MCP: queued/in progress → ready for review.                 |
| POST   | `/api/v1/annotations/:id/accept`          | Browser: ready for review → accepted.                       |
| POST   | `/api/v1/annotations/:id/request-changes` | Browser: follow-up comment creates a new queued revision.   |
| POST   | `/api/v1/annotations/:id/snapshots`       | Browser uploads evidence for the current revision.          |
| POST   | `/api/v1/annotations/:id/archive`         | Browser: `{ expectedVersion, archived }` hides or restores. |
| POST   | `/api/v1/annotations/:id/delete`          | Browser: `{ expectedVersion }` removes permanently.         |
| GET    | `/api/v1/snapshots/:id`                   | Read authenticated, project-scoped PNG bytes.               |
| GET    | `/api/v1/events`                          | Authenticated fetch-based SSE hints.                        |

## Managed runs

The `/api/v1/managed` response also includes a trusted setup-command prefix and,
when available, the selected runner's bounded readiness snapshot. Readiness
reports only enums for adapter, native CLI sign-in and billing, plus a check
timestamp. No raw provider output, account email or credential is included.
`POST /api/v1/runner/readiness` accepts this snapshot with the runner capability
only; browser/MCP credentials cannot forge it.

| Method | Path                        | Capability / behavior                                              |
| ------ | --------------------------- | ------------------------------------------------------------------ |
| GET    | `/api/v1/managed`           | Browser/MCP: mode, online hint and browser-safe run/session state. |
| POST   | `/api/v1/runs`              | Browser in managed mode: submit a revision for execution.          |
| POST   | `/api/v1/runs/:id/stop`     | Browser: request cancellation.                                     |
| POST   | `/api/v1/runs/:id/answer`   | Browser: answer a pending interaction.                             |
| POST   | `/api/v1/runner/claim`      | Runner only: atomically claim a job and receive its lease.         |
| POST   | `/api/v1/runner/:id/update` | Runner only: update leased work and heartbeat.                     |

Dispatch accepts `{ annotationId, revisionId, requestId, sessionId? }`. IDs are
UUIDs. Reusing `requestId` with the same routing is idempotent. Omitting
`sessionId` creates a fresh session; an explicit session must belong to the same
project/provider. Only one editing run is allowed per project. Active managed
runs block generic annotation transitions on their owned revision.

An answer contains `{ interactionId, decision?, answers? }`: permissions use
`decision: 'accept' | 'decline'`; questions use a map of field IDs to string
answers. Runner updates require the per-run lease. Runner credentials are rejected
on browser/MCP routes and whenever an Origin header is present.

Run IDs and session IDs are independent of annotation/revision IDs. Failure or
cancellation does not accept/reject the annotation or revert files. A valid
implementation report makes the revision ready for human review.

## Annotation mutation bodies

State changes require `expectedVersion`. Implementation reports also require
`summary`, and optionally `changedFiles` / `commitSha`. Request changes requires
a trimmed, non-empty `comment` of at most 2,000 characters.

IDs, project namespace, statuses and timestamps are server-managed. Strict JSON
schemas reject extra authority fields such as a client-supplied `actor`.

Snapshot uploads accept:

```ts
{
  expectedVersion: number;
  revisionId: string;
  kind: 'before' | 'after';
  integrity: 'captured' | 'manual';
  dataUrl: string; // bounded data:image/png;base64,...
}
```

Before may attach once while queued; after may attach once while ready for review.
Old/accepted revisions and existing evidence cannot be overwritten. The bridge
derives image dimensions from validated bytes and chooses its own file name.

## Limits and errors

Ordinary JSON bodies are capped at 32 KiB. Snapshots have a separate bounded base64
body limit, 2 MiB image-byte cap and 2048×2048 dimensions. Request rates are bounded
at 600/minute and SSE subscriptions at 16.

Errors return `{ error: { code, message } }`. Common statuses are 400 for invalid
input, 401 for missing/invalid capability, 403 for denied origin/scope, 404 for
missing records, 409 for stale versions or invalid transitions, 413 for size
limits and 429 for request/subscription limits.

## Event hints

`annotation.created`, `annotation.updated`, `annotation.review_ready`, and
`annotation.accepted` contain `{ annotationId, projectId, version, status }`.
`annotation.deleted` carries the last state of a removed annotation.

Archived annotations carry `archivedAt`. MCP reads never list them and agents
cannot claim or run them; the browser sees them flagged. Deleting removes the
annotation, its snapshots, its runs and any session no other annotation uses.
Neither action is allowed while an agent runs on the annotation, and neither
undoes code changes.
Events are hints; refetch current state on reconnection. Use authenticated fetch
streaming, with the capability in a header.

`annotation.runs` is a refetch hint for managed run state; its data is an empty
object. Refetch `/api/v1/managed` and the annotations rather than inferring a
successful run from the event itself.
