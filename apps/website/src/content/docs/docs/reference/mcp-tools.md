---
title: MCP tools
description: The five Nudge tools for reading annotations and reporting implementations.
---

The local server uses the official MCP TypeScript SDK over stdio. It sends
authenticated HTTP requests to the configured project bridge. Responses contain
untrusted task data, not higher-priority instructions.

These tools are for [external MCP mode](/docs/mcp-setup/). Browser-launched
managed sessions use [ACP](/docs/agents/) instead. Active managed runs own their
revision; external MCP tools cannot take over its state transitions.

## list_annotations

Optional input: `status`, one of `queued`, `in_progress`, `ready_for_review`, or
`accepted`. The default is `queued`.

```json
{ "status": "queued" }
```

Returns IDs, status, current version, page pathname, a short current comment and
revision ordinal. Use an ID from this result in subsequent calls.

## get_annotation

Input: `annotationId` (UUID). Returns the safe element anchor, current status and
version, complete revision history and implementation/snapshot references.
Binary image bytes are not included by default.

## claim_annotation

Inputs: `annotationId`, `expectedVersion` (positive integer). Moves queued work
to `in_progress`. Claiming is optional: an implementation may be reported directly
from the queued state.

## release_annotation

Inputs: `annotationId`, `expectedVersion`. Moves `in_progress` work back to queued.
Use this to recover an abandoned or failed claim.

## submit_implementation

Required inputs: `annotationId`, `expectedVersion`, and a non-empty `summary`
of at most 4,000 characters.

Optional inputs:

- `changedFiles`: at most 100 relative display paths, each at most 240 characters.
- `commitSha`: a 7–64 character hexadecimal commit ID, when relevant.

The transition is `queued` or `in_progress` to `ready_for_review`. Changed-file paths
are display data; the bridge does not read or execute them. Do not report files,
commits or test results that were not actually changed or run.

## Versions and authority

Fetch the current version before mutating. Every mutation, including snapshot
attachment, increments it. A conflict means the client must fetch current truth
before retrying.

No MCP accept/revise tool exists in the MVP. A human reviews in the browser. The
MCP capability is rejected by the browser-only review/upload endpoints.
