# Load Last Session Command

## Instruction
Load and analyze the most recent session documentation from the `.claude/sessions/` directory to continue where the previous conversation left off.

## Action Steps

### 1. Locate Session File
- Search for the most recent `.md` file in `.claude/sessions/` directory
- The files follow naming pattern: `YYYYMMDD_HHMMSS_{overview}.md`
- Select the file with the latest timestamp

### 2. Read Session Documentation
- Load the complete content of the most recent session file
- Parse all sections of the documentation

### 3. Extract Critical Information
From the loaded documentation, extract and understand:
- **Session Overview**: Main topics and objectives
- **Technical Findings**: All code, configurations, and solutions
- **Current State**: Exact project status at session end
- **Context for Continuation**: Background, assumptions, constraints
- **Next Actions**: Immediate steps to be taken
- **Additional Information**: Edge cases, warnings, user preferences

### 4. Restore Working Context
Based on the documentation:
- Reconstruct the project state and context
- Identify any artifacts or files that were being worked on
- Note any pending tasks or unresolved issues
- Understand user's specific requirements and preferences

### 5. Confirm Restoration
After loading the session:
- Provide a brief summary of what was loaded
- Confirm understanding of:
  - The main topic/project
  - Current state of work
  - Next planned actions
- Ask if the user wants to:
  - Continue with the documented next steps
  - Address a specific aspect from the session
  - Start something new but related

### 6. Ready for Continuation
Be prepared to:
- Continue exactly where the last session ended
- Reference specific code or solutions from the session
- Maintain consistency with previous decisions and approaches
- Apply any user preferences noted in the documentation

## Usage Example
User: "Load my last session and continue where we left off"

Assistant response:
"I've loaded your session from [timestamp] about [topic]. You were working on [specific task] and had completed [what was done]. The next step was to [next action]. 

Current state:
- [Key status points]

Would you like to continue with [specific next step] or address something else from the session?"

## Alternative Commands
- "Read my last session notes"
- "Continue from previous session"
- "Load session from [specific date]"
- "Show me what we were working on last time"

## Error Handling
If no session files are found:
- Inform the user that no session documentation was found
- Suggest checking the `.claude/sessions/` directory
- Offer to start a new session with documentation

If multiple sessions exist from the same day:
- List the available sessions with timestamps and overviews
- Ask which session to load

## Important Notes
- Always maintain the context and technical state from the loaded session
- Respect any constraints or preferences documented
- Be ready to work with any artifacts or code mentioned in the session
- If the session references external files or resources, verify their availability