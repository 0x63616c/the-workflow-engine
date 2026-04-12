---
name: searching-conversations
description: >
  Search past Claude Code conversation history for context, decisions, or prior work.
  Use when user asks "did we discuss", "what did we decide", "when did we", "find that
  conversation where", "search history", or invokes /searching-conversations.
user_invocable: true
---

# Searching Conversations

Search past conversation logs to find decisions, context, prior work, or anything discussed in previous sessions.

## Storage Layout

```
~/.claude/projects/
  {project-dir}/           # e.g. -Users-calum-code-github-com-0x63616c-the-workflow-engine
    {uuid}.jsonl           # One file per conversation session
    {uuid}/subagents/      # Optional: sub-agent conversations
      agent-{id}.jsonl
      agent-{id}.meta.json
```

- Format: JSONL (one JSON object per line)
- No index file. Must scan/grep to search.
- Project dir for this repo: `-Users-calum-code-github-com-0x63616c-the-workflow-engine`

## Record Schema

Key fields in each JSONL record:

| Field | Description |
|-------|-------------|
| `type` | `user`, `assistant`, `tool_use`, `tool_result`, `system`, `thinking` |
| `timestamp` | ISO 8601 UTC |
| `sessionId` | UUID linking all messages in a session |
| `message.content` | Text content (string or array of content blocks) |
| `message.role` | `user` or `assistant` |
| `gitBranch` | Branch at time of message |

## Search Strategy

### Quick Keyword Search

Fastest. Use for specific terms, error messages, file paths, feature names.

```bash
grep -rl 'search term' ~/.claude/projects/-Users-calum-code-github-com-0x63616c-the-workflow-engine/*.jsonl | head -20
```

Then read matching files with context:

```bash
grep -n 'search term' <file.jsonl> | head -20
```

### Extract Human-Readable Content

Pull user and assistant messages containing a term:

```bash
grep 'search term' <file.jsonl> | jq -r 'select(.type == "user" or .type == "assistant") | "\(.timestamp) [\(.type)] \(.message.content | if type == "array" then map(select(.type == "text") | .text) | join(" ") else . end)"' 2>/dev/null | head -30
```

### Find Recent Conversations

List sessions by recency:

```bash
ls -lt ~/.claude/projects/-Users-calum-code-github-com-0x63616c-the-workflow-engine/*.jsonl | head -20
```

### Search by Date Range

Find conversations from a specific period:

```bash
find ~/.claude/projects/-Users-calum-code-github-com-0x63616c-the-workflow-engine/ -name "*.jsonl" -newermt "2026-04-01" -not -newermt "2026-04-13" | while read f; do echo "=== $f ==="; head -1 "$f" | jq -r '.timestamp // empty'; done
```

### Search Sub-Agent Conversations

```bash
find ~/.claude/projects/-Users-calum-code-github-com-0x63616c-the-workflow-engine/*/subagents/ -name "*.jsonl" 2>/dev/null | xargs grep -l 'search term'
```

### Cross-Project Search

When searching all projects (rare):

```bash
grep -rl 'search term' ~/.claude/projects/*/*.jsonl | head -20
```

## Workflow

### 1. Understand the Query

What is the user looking for?
- Specific decision ("what did we decide about auth?")
- Prior work ("did we implement caching?")
- Context ("when did we add the socket_vmnet script?")
- Conversation ("find where we discussed worktree naming")

### 2. Search

Start with quick keyword grep. If too many results, narrow:
- Add more specific terms
- Filter by date range
- Filter by message type (user vs assistant)

### 3. Extract Context

Once you find relevant sessions:
- Read surrounding messages for context (use `jq` to extract a window of messages from that session)
- Look for decisions, conclusions, action items
- Note the timestamp and branch for temporal context

### 4. Report

Summarize what you found:
- When it was discussed (date)
- What was decided or done
- Link to relevant session if useful (session UUID)
- Quote key messages if short

## Tips

- **Start broad, narrow down.** `grep -rl` first to find files, then `grep -n` in specific files.
- **User messages are most searchable.** Users type natural language. Assistant messages have tool calls mixed in.
- **File sizes vary wildly.** Small sessions: <1KB. Large sessions: 8MB+. Don't `cat` large files.
- **jq can fail on malformed lines.** Use `2>/dev/null` or `jq -R 'fromjson? //'` for resilience.
- **Timestamps are UTC.** Convert to local time if reporting to user.
- **Dispatch an agent** for deep searches across many files. Keep main context clean.

## Anti-patterns

- Reading entire large JSONL files into context (use grep + jq to extract only relevant lines)
- Searching without narrowing scope (always start with project-specific directory)
- Reporting raw JSON to user (extract and format human-readable content)
- Guessing from memory instead of actually searching the logs
