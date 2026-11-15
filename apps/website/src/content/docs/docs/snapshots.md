---
title: Snapshots
description: Understand optional element captures, their limits, and recovery when a comparison is unavailable.
---

## Opt into capture

In the composer, select **Capture before and automatically capture after** before
running or queueing the request. Capture is off by default. Visible screenshots can contain sensitive
information, so review what the selected region includes.

The capture library is loaded when needed. Form controls, editable regions,
hidden nodes and content marked with `data-nudge-private` are excluded. The capture
is an element-region image, not a browser-privileged viewport screenshot.

## After the agent reports

Open **View comparison** in the comment to inspect images and capture/recovery
controls. It starts closed, and images load on demand. You can review the live
app and accept or request changes without expanding the comparison.

When an annotation has a saved before image and becomes ready for review, Nudge
tries to locate the same element using a stable test ID or ID and captures an
after image for that revision.

| Lookup result    | Behavior                                                   |
| ---------------- | ---------------------------------------------------------- |
| One stable match | Attempt after capture.                                     |
| No match         | Show **Element not found** and allow explicit reselection. |
| Multiple matches | Show **Ambiguous anchor** and allow recovery.              |

Positional CSS paths remain useful agent context, but do not qualify as confident
recapture identity. Give important demo elements stable `data-testid` attributes.

## Retry or reselect

**Capture before/after** retries the stored anchor. **Reselect for before/after**
enters selection mode so you can choose the intended replacement. Manual captures
are labeled and never presented as automatic identity verification.

A snapshot already attached to a revision cannot be overwritten. Historical and
accepted revision evidence is immutable. A new follow-up revision can have its
own new baseline and after image.

## Supported images and limits

- Canvas-generated **PNG** only, up to **2 MiB**.
- At most **2048 × 2048 pixels**, 8-bit RGB/RGBA, without interlacing.
- Capture regions are bounded and limited to 1,500 descendant elements.
- Font downloads are skipped; available/system fonts may render differently.
- External images, CSS image resources, responsive image sources and unsupported roots may prevent capture.
- Iframes and closed shadow roots are outside the MVP scope.

The bridge checks PNG structure, CRCs, dimensions and bounded decompression before
writing a generated UUID filename. Image reads require project authorization.

## Evidence still needs a reviewer

No heatmap, score or automated “verified” claim is produced. Images can reveal
a useful difference, but the intended result is a human judgment. If capture fails,
Nudge keeps the request and implementation summary available for manual review.
