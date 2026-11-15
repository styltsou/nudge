# 03 — Data model, HTTP API, MCP contract

This document defines the **public semantics** that tests and code must honor. Internal naming and implementation are flexible where not specified.

## Core types

The existing annotation/MCP contract below remains implemented and valid.
Managed-agent runs have a separate implemented run/job lifecycle and event
contract; see [doc 09](09-MANAGED-AGENT-RUNS.md) and the managed-run protocol
addition below. Provider errors do not overload human review states.

Runs distinguish new-session intent (default) from explicit continuation.
A run links one annotation revision and one resolved session; a session may
contain runs from different annotations. Validate project/provider ownership and
idempotent creation server-side. The additive payloads are implemented and tested.

```ts
type AnnotationStatus =
  'queued' | 'in_progress' | 'ready_for_review' | 'accepted';

type ElementAnchor = {
  pageUrl: string; // local URL sanitized (no credentials/hash/tokens)
  pathname: string;
  selector: string | null; // best effort; no arbitrary evaluation
  testId?: string;
  tagName: string;
  role?: string;
  textPreview?: string; // <= 160 chars, scrub sensitive nodes
  rect: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
  devicePixelRatio?: number;
};

type SnapshotRef = {
  id: string;
  kind: 'before' | 'after';
  capturedAt: string;
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  integrity?: 'captured' | 'manual' | 'anchor-uncertain';
};

type Revision = {
  id: string;
  annotationId: string;
  ordinal: number;
  comment: string;
  createdAt: string;
  implementation?: {
    summary: string;
    changedFiles?: string[];
    commitSha?: string;
    reportedAt: string;
  };
  beforeSnapshot?: SnapshotRef;
  afterSnapshot?: SnapshotRef;
};

type Annotation = {
  id: string;
  projectId: string; // local project namespace, generated at init
  anchor: ElementAnchor;
  status: AnnotationStatus;
  revisions: Revision[];
  createdAt: string;
  updatedAt: string;
};
```

Use strict Zod schemas and derived TS types. Never trust browser-provided `projectId`, file paths, selectors or page URL without validating and scoping.

## State machine

```text
[new] --create--> queued
queued --agent claim--> in_progress
queued --agent submit implementation--> ready_for_review
in_progress --agent submit implementation--> ready_for_review
ready_for_review --user accept--> accepted
ready_for_review --user request changes with comment--> queued [new revision]
in_progress --agent release/fail--> queued
```

`accepted` is terminal in MVP; to make another change, create a new annotation. Invalid transitions return HTTP 409. Snapshot capture can update a revision in place without changing status. `in_progress` is advisory (multiple agents may be connected); add optimistic concurrency (`version` or `updatedAt`) to prevent stale writes. A claimed task must not silently remain blocked forever: support an explicit release operation and document manual recovery.

## HTTP API (versioned at `/api/v1`)

All JSON inputs are validated, all errors return `{ error: { code, message } }`. State changes are authenticated; all read routes require auth too. Explicit `Origin` allowlist; only accept `localhost` dev origins listed by user config. Bind to loopback only. For browser use a header `Authorization: Bearer <token>`; on SSE use an authenticated fetch-based stream if EventSource headers unavailable, or a scoped short-lived event ticket. **Never put long-lived tokens in query strings.**

| Method | Path                                      | Purpose                                              |
| ------ | ----------------------------------------- | ---------------------------------------------------- |
| GET    | `/health`                                 | Liveness only (no secret/state exposure)             |
| GET    | `/api/v1/annotations?status=queued`       | List summaries, filtered to this project             |
| POST   | `/api/v1/annotations`                     | Create annotation with initial comment and anchor    |
| GET    | `/api/v1/annotations/:id`                 | Fetch annotation and revisions                       |
| POST   | `/api/v1/annotations/:id/claim`           | Transition queued → in_progress                      |
| POST   | `/api/v1/annotations/:id/release`         | Transition in_progress → queued                      |
| POST   | `/api/v1/annotations/:id/implementation`  | Agent reports implementation; ready_for_review       |
| POST   | `/api/v1/annotations/:id/accept`          | Human accepts after review                           |
| POST   | `/api/v1/annotations/:id/request-changes` | Human supplies next comment/revision                 |
| POST   | `/api/v1/annotations/:id/snapshots`       | Upload validated image for current revision and kind |
| GET    | `/api/v1/snapshots/:id`                   | Authenticated snapshot bytes                         |
| GET    | `/api/v1/events`                          | Authenticated SSE annotation-change stream           |

Use explicit role/authority separation on mutations: MCP token or channel can claim/release/report; browser token or channel can accept/request changes. In MVP tokens may both be local capabilities minted by bridge, but do **not** trust a caller-provided `actor` property alone. A separate browser and MCP capability is preferred.

### Illustrative create request

```json
{
  "comment": "Make the analytics chart taller and add vertical spacing",
  "anchor": {
    "pageUrl": "http://localhost:5173/dashboard",
    "pathname": "/dashboard",
    "selector": "[data-testid=\"analytics-chart\"]",
    "testId": "analytics-chart",
    "tagName": "DIV",
    "rect": { "x": 120, "y": 240, "width": 640, "height": 180 },
    "viewport": { "width": 1280, "height": 800 }
  }
}
```

`projectId`, IDs, timestamps and status are server-managed. File paths are information for the agent, **not commands**.

### Illustrative implementation request

```json
{
  "summary": "Increased chart min-height and adjusted card spacing.",
  "changedFiles": ["src/components/AnalyticsChart.tsx"]
}
```

Do not accept user-controlled absolute paths for storage or use changedFiles to read the disk; treat changedFiles as display-only strings after normalization and length limits.

## MCP tools (stdio server)

The local MCP server reads bridge URL and MCP token from environment/config; exposes:

- `list_annotations` — optional `status` filter (`queued` default); returns IDs, short comments, page paths, status and revision ordinal.
- `get_annotation` — annotation ID; returns full safe anchor context, latest comment, revision history and current status, but **no binary screenshot bytes** by default.
- `claim_annotation` — annotation ID, expected version; moves queued → in_progress.
- `release_annotation` — annotation ID, expected version; returns to queued.
- `submit_implementation` — annotation ID, expected version, concise summary, optional changedFiles and commitSha; moves to ready_for_review.

The agent is **not permitted to accept or request changes on behalf of the human** through MVP MCP tools. Keep that browser-only.

### Optional read-only MCP resource

`nudge://annotations/{id}` may return the same structured metadata as `get_annotation` if useful. Do not make resources a blocking dependency for the MVP.

## Event contract

`annotation.created`, `annotation.updated`, `annotation.review_ready`, `annotation.accepted` with `{ annotationId, projectId, version, status }`. On reconnect, client refetches current truth. Events are hints, not authoritative state.

## Snapshot lifecycle

- Before snapshot attaches to the **current revision** at annotation creation/first capture.
- After snapshot attaches to that same revision when agent reports completion and anchored element is recaptured.
- If user requests changes, a **new revision** starts. New baseline capture is preferred; previous revision and snapshots are immutable history.
- If selected DOM node no longer exists, label after state **Element not found**. If several anchors match, label **Ambiguous anchor**. User can manually reselect and capture; don't silently pick a different node.
- Snapshot differences are visual evidence only. No automated “verified” claim.

## Persistence invariants

### Snapshot upload details (MVP)

`POST /api/v1/annotations/:id/snapshots` accepts strict JSON `{ expectedVersion, revisionId, kind, integrity, dataUrl }`. `kind` is `before` or `after`; integrity is `captured` or explicit `manual`; `dataUrl` must be a PNG base64 data URL. IDs, capture timestamps, dimensions and storage paths are server-owned. Only browser capability may upload. Before attaches once while queued; after attaches once while ready for review. A stale version/revision, duplicate kind, or historical/accepted revision returns 409. Every successful attachment increments the annotation version and emits an update hint. Metadata and the annotation are committed transactionally; a failed write leaves no referenced image.

The first implementation supports PNG only, with 2 MiB encoded image bytes, 2048×2048 dimensions, RGB/RGBA 8-bit non-interlaced pixels, CRC validation and bounded inflation. JPEG remains reserved in the common reference type. Reads use a generated snapshot UUID and require the same project capability; images are served as `image/png` with no-store, nosniff and a restrictive CSP. Browsers fetch bytes using Authorization and render local object URLs, never credential-bearing URLs.

UUID IDs; timestamps UTC ISO8601; integer version increments per mutation; latest revision ordinal monotonically increasing; ensure one active revision per annotation; all state transitions transactional. Snapshot MIME check includes magic-byte detection and size/dimension limits. Do not use filename from client as storage path.

# Managed-run protocol addition

The existing five MCP tools and annotation/revision semantics are unchanged.
`GET /api/v1/managed` returns browser-safe run/session status. Browser capability
can `POST /api/v1/runs` with annotationId, revisionId, requestId and optional local
sessionId; omission means a new session. Replaying requestId is idempotent.
`POST /api/v1/runs/:id/stop` requests cancellation and `/answer` answers the
currently pending interaction. Explicit reuse validates project ownership and
availability; one editing run per project is allowed.

A distinct runner capability, forbidden on browser/MCP routes and forbidden with
Origin, can use `POST /api/v1/runner/claim` and `/:id/update`. Claims return a
per-run lease; updates require it. The browser never receives this lease, runner
credential or provider session identifier. Generic annotation transitions are
blocked while a managed run owns its revision. Structured completion reports
reuse the existing implementation transition; acceptance remains human-only.
Runs/session records and bounded activity are persisted in project-scoped SQLite
records. Restart/heartbeat expiry interrupts work, releases the annotation and
requires explicit retry. SSE run notifications trigger a state refetch.
