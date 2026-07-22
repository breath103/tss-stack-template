---
name: write-document
description: Write a document summarizing the current conversation to ./documents/. Use when the user wants to capture a discussion as a feature doc, decision record, or any other document category.
---

# Write Document

Summarize the current conversation into a markdown document and save it to `./documents/`.

## Usage

```
/write-document [category] [topic]
```

- `category` — subfolder under `./documents/` (e.g., `features`, `coding-guidelines`). If omitted, infer from context.
- `topic` — short slug for the filename. If omitted, infer from context.

## Process

1. Identify the category and topic from args or conversation context
2. Pick a filename: `./documents/{category}/{YYYY-MM-DD}_{slug}.md` (e.g., `2026-02-20_agent-runtime-lambda.md`)
3. Review existing docs in that category (`ls ./documents/{category}/`) to match style and avoid duplicates
4. Write the document capturing the key points from the conversation:
   - Title as H1
   - Summary section (2-3 sentences)
   - Relevant sections with details, code examples, diagrams as appropriate
   - Keep it concise — capture decisions and rationale, not the full back-and-forth
5. Save with the Write tool
6. Report the file path to the user

## Style

- Match the tone and structure of existing docs in `./documents/`
- Use technical writing: direct, no filler
- Include code snippets and diagrams where they clarify
- Capture the "why" behind decisions, not just the "what"
- If the conversation had debate or rejected alternatives, note them briefly
