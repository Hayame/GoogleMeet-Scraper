# Session Documentation Prompt

## Instruction

Create a comprehensive basic-memory documentation of this entire conversation session. The documentation should be saved as a markdown file in `.claude/sessions/` directory with the filename format: `{timestamp}_{overview}.md` where timestamp is `YYYYMMDD_HHMMSS` and overview is a short summary of the session topic with spaces replaced by underscores.

The documentation should include:

### 1. Date & Time Stamp
- Record the current date and time of documentation creation
- Note the session duration if applicable

### 2. Session Overview
- Summarize the main topic(s) discussed
- List the primary objectives or problems addressed
- Identify the user's main goals

### 3. Technical Findings
- Document all technical discoveries, solutions, or approaches discussed
- Include specific code snippets, configurations, or technical details
- Note any tools, libraries, or technologies referenced
- Record any errors encountered and their resolutions

### 4. Current State
- Describe the exact state of any projects, code, or tasks at session end
- List what has been completed vs. what remains pending
- Include the status of any artifacts or files created/modified

### 5. Context for Continuation
- Provide necessary background information for seamless continuation
- Include any assumptions made or constraints identified
- Note any dependencies or prerequisites
- Record user preferences or specific requirements mentioned

### 6. Next Action Ready
- List the immediate next steps to be taken
- Include any pending decisions that need to be made
- Note any resources or information needed for continuation

### 7. Additional Important Information
- Document any edge cases or special considerations discussed
- Include relevant warnings or important caveats
- Note any user-specific preferences or requirements
- Record any unresolved questions or areas needing clarification

## Format Requirements

Structure this as a detailed session note that would allow a new agent to immediately understand the complete context, technical state, and overall state of the workspace to continue where we left off. 

The documentation should be comprehensive enough that someone could start a new conversation by requesting to **"read from notes and continue where we left off"** and have complete understanding going forward.

## Saving Documentation

### File Location and Naming
- Save file in directory: `.claude/sessions/`
- Filename format: `{timestamp}_{overview}.md`
  - `{timestamp}` - format: `YYYYMMDD_HHMMSS`
  - `{overview}` - short summary of session topic (max 3-5 words)
  - Replace all spaces in overview with `_`

### Filename Examples
- `20250116_143022_python_api_integration.md`
- `20250116_095515_react_component_debugging.md`
- `20250116_201830_database_schema_optimization.md`

## Usage Example

At the end of a work session, use this prompt to create complete documentation that will enable continuation of work in a new conversation without losing context. Remember to save the file in the appropriate location with the correct filename.