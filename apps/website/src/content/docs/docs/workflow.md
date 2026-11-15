---
title: Annotation and review
description: Select an element, run your agent, and accept or iterate on the result.
---

## Point at what needs changing

Click **Annotate UI** or press **Alt+Shift+A**, then click an element. A comment
composer opens beside it. Describe the outcome you want: “Make this button as tall
as the search field” is more useful than “Fix this.”

Nudge includes context about the element: a sanitized page URL, selector, tag,
short text preview, position and viewport. This helps the agent find the source;
it does not guarantee a source-file or line-number mapping.

Comments remain as numbered pins. Click a pin to reopen it, or use **Feedback**
to find requests whose elements are missing. **Open in side panel** docks the
comment; **Pin to element** returns it to the page.

## Run the agent

Use **Agent setup** in the toolbar if the agent is not ready. You can inspect
connection and sign-in hints there without losing your draft. In managed mode,
**Save without running** keeps a queued comment for later; it does not dispatch
work. Known missing setup or sign-in states disable **Run agent** with guidance.

In [managed mode](/docs/agents/), click **Run agent**. Nudge creates a durable
run and starts the configured agent through ACP.

Each submission defaults to **New session**, including follow-ups on the same
item. Choose an existing session explicitly when you want its conversation
history. An item can have several sessions; a session can handle several items.
Only compatible sessions in this project are eligible. Requests on different
elements can run at the same time (three by default); a session handles one
request at a time, and extra requests wait their turn.

| Run state                      | What you should expect                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| Waiting for runner             | A run is saved and waiting to be claimed.                          |
| Starting agent                 | The runner is starting the agent connection/session.               |
| Agent working                  | The agent is active; open **Agent activity** for bounded progress. |
| Waiting for you                | Answer a supported question or allow/deny a permission request.    |
| Stopping agent                 | Stop has been requested; existing edits are not reverted.          |
| Ready for review               | A valid implementation report arrived. Inspect the result.         |
| Failed, stopped or interrupted | Inspect any existing edits before retrying.                        |

The activity indicator reflects run state. Agent exit alone never makes a request
ready for review. Run state survives refresh. Runs have a 30-minute lifetime;
lost runner heartbeats or restart mark unfinished work interrupted rather than
automatically replaying it.

### If you see Queue for agent

You are using [external MCP mode](/docs/mcp-setup/). **Queue for agent** saves
the request locally, then you explicitly ask your existing agent host to fetch
it. It does not launch a session or inject a message into an open conversation.

In that mode, **Agent working** means an external agent claimed the annotation;
the claim is advisory and does not establish an active managed process.

## Answer or stop

Supported permissions appear in the comment with **Allow once** and **Deny**.
Supported questions offer fields for your response. Agent-native policies still
apply. Unsupported requests fail closed; Nudge does not weaken permissions to
keep a task moving.

Choose **Stop agent** to interrupt a run. Work already written to disk remains.
After a failure or interruption, inspect the app/code, resolve the cause and use
**Retry agent**. A retry defaults to a new session; continuation remains explicit.

## Review the actual app

When the agent reports completion, read its summary and inspect the running app.
Check the code and any reported tests when appropriate.

- **Accept** records your acceptance. It is not an automated correctness score.
- **Request changes** requires a follow-up and creates a new revision.
- In managed mode, that follow-up starts another run and defaults to a new session.
- In external MCP mode, the revision waits for your external agent to fetch it.

Optional before/after images and capture controls are under **View comparison**.
You can review the running app and make a decision without opening them.
[Snapshots](/docs/snapshots/) explains capture consent, limitations and recovery.

If an element is missing or ambiguous, Nudge does not pin or compare a guessed
replacement. Recover through **Feedback**, retry capture, explicitly reselect, or
inspect the change manually.

## Keep the history

Each revision retains its request, implementation report and evidence. A new
follow-up does not overwrite the previous result. If prior capture consent
exists, Nudge attempts a fresh baseline for the next revision.

Accepted annotations are terminal in this preview. Create a new annotation for
another change.
