# Prompt for Generating System Module Documentation

## Input
$ARGUMENTS

## Task
Based on provided input information about a specific module/functionality of the system, create project documentation consisting of three Markdown files and update system files.

**IMPORTANT**: If the provided information is incomplete, DO NOT create partial documentation. Instead, formulate a list of clarifying questions and continue the dialogue until all necessary information is obtained. Documentation must be 100% complete and enable implementation without additional questions.

## Context
This prompt is used to document individual fragments of a larger system. Each module receives its own documentation, which later combines into complete system documentation.

## Folder and File Structure

### Module Files
Create/place files in folder: `docs/project/{task_name}/`
where `{task_name}` is a shortened, descriptive module name (e.g., `user-auth`, `payment-proc`, `report-gen`)

The folder contains three files:
- `requirements.md`
- `design.md`
- `tasks.md`

### System Files (in `docs/project/` folder)
Create or update the following files:

#### 1. `ui_design_system.md`
File containing complete design system for the entire project. When documenting each module:
- Analyze module's UI requirements
- Update design system with new elements if needed
- Ensure consistency with existing guidelines

Design system content:
```markdown
# UI Design System

## Fundamentals
### Color Palette
- Primary colors (light/dark mode)
- Secondary colors
- Semantic colors (success, warning, error, info)
- Neutral colors
- Gradients and shadows

### Typography
- Font families
- Font sizes and scale
- Line heights
- Font weights
- Text styles (headings, body, captions)

### Spacing & Layout
- Grid system
- Spacing scale
- Container widths
- Breakpoints

### Components
- Buttons (variants, states, sizes)
- Forms (inputs, selects, checkboxes)
- Cards and containers
- Navigation elements
- Modals and overlays
- Tables and lists
- Icons and illustrations

### Patterns
- Loading states
- Empty states
- Error states
- Success feedback
- Animations and transitions

### Accessibility
- Color contrast requirements
- Focus states
- ARIA guidelines
- Keyboard navigation

### Dark Mode
- Color transformations
- Contrast adjustments
- Special considerations

### UI Libraries
- Used libraries (e.g., Material-UI, Ant Design, Tailwind)
- Library customizations
- Custom vs library components
```

Design system should:
- Align with latest UX/UI trends
- Be adapted to project nature
- Ensure intuitiveness and clarity
- Meet highest market standards

#### 2. `system_flow.md`
File describing flows and dependencies between modules:
```markdown
# System Flow & Dependencies

## Module Map
[List of all modules with brief descriptions]

## Data Flows
### Shared Data Entities
- [Entity]: used by modules [X, Y, Z]

### Inter-module Communications
- Module A → Module B: [flow description]

## Integration Points
### Synchronous Dependencies
- Module X requires Module Y for [functionality]

### Asynchronous Dependencies
- Module X publishes events consumed by Module Y

## Critical Paths
[Description of critical data flow paths in the system]
```

### 1. requirements.md - Module Functional Requirements
Content:
- **Module name and its purpose** in the system context
- **Dependencies** on other system modules
- **User Stories** for this module only:
  ```
  As a [user type]
  I want to [action/functionality in this module]
  So that [business value/goal]
  ```
- **Acceptance Criteria** for each user story:
  ```
  Given [initial context]
  When [action]
  Then [expected result]
  ```
- **Interfaces with other modules** (what module exposes/consumes)
- **Prioritization** of module functionality (Must have, Should have, Could have)

### 2. design.md - Module Technical Documentation
Document structure:

#### Module Overview
- Module name and identifier
- Module responsibility in the system
- Module boundaries (what is and isn't part of the module)
- Key module functionalities

#### Module Dependencies & Impact
**Dependencies on other modules:**
- Module X: [description of what's needed from module X]
- Module Y: [integration description]

**Impact on other modules:**
- Module A: [what needs to be adjusted in module A]
- Module B: [required changes]

**Shared resources:**
- Shared models: [list]
- Shared services: [list]
- Common utilities: [list]

#### Module Architecture
**a) Technology Stack** (module-specific)
- Technologies used in module
- Libraries and dependencies
- Component versions

**b) Module Data Flow**
- Data flow within module
- Module entry/exit points
- Interactions with other modules
- Operation sequences in module

**c) Module Components and Interfaces**

*Backend (if applicable):*
- Services/classes in module
- Responsibilities of each component
- Data Models used in module:
  ```
  Entity: UserProfile (module: user-authentication)
  Fields:
    - userId: UUID
    - lastLogin: Timestamp
    - preferences: JSON
  ```
- API Endpoints exposed by module:
  ```
  POST /api/v1/auth/login
  Module: user-authentication
  Description: Authenticates user
  Request: { email, password }
  Response: { token, user }
  Used by modules: [all-modules]
  ```

*Frontend (if applicable):*
- UI components belonging to module
- Routing/navigation in module
- Module local state
- Integration with module API
- UI for different devices (if module-specific)

**d) Module Data Models**

*Entities belonging to module:*
- Tables/collections used by module
- Relations with other module entities
- Example:
  ```sql
  -- Module: payment-processing
  Table payments {
    id: UUID [primary key]
    user_id: UUID [foreign key -> users.id from user-management module]
    amount: Decimal
    status: Enum
  }
  ```

*Module interfaces:*
```typescript
// Module: payment-processing
export interface PaymentRequest {
  userId: string; // from user-management module
  amount: number;
  method: PaymentMethod;
}
```

*Module API contracts:*
- Public module API for other modules
- Internal module API

**e) Module Error Handling**
- Module-specific errors
- Module error codes (e.g., AUTH-001, PAY-002)
- Error propagation to other modules

**f) Module Testing Strategy**
- Unit tests for module components
- Integration tests with other modules
- Mocking external dependencies

### 3. tasks.md - Module Implementation Plan
Content:
- **Module identifier**: [MODULE-ID]
- **Implementation dependencies**: which modules must be ready
- **Module implementation tasks**:
  ```
  ## [MODULE-ID] Module name
  
  ### Setup and configuration
  - [ ] [TASK-MOD-001] Module directory structure (2h)
  - [ ] [TASK-MOD-002] Dependencies configuration (1h)
  
  ### Backend implementation
  - [ ] [TASK-MOD-010] Data models (4h)
  - [ ] [TASK-MOD-011] Business services (8h)
  - [ ] [TASK-MOD-012] API endpoints (6h)
  
  ### Frontend implementation
  - [ ] [TASK-MOD-020] UI components (8h)
  - [ ] [TASK-MOD-021] API integration (4h)
  
  ### Testing
  - [ ] [TASK-MOD-030] Unit tests (4h)
  - [ ] [TASK-MOD-031] Integration tests (3h)
  
  ### Integration
  - [ ] [TASK-MOD-040] Integration with module X (2h)
  - [ ] [TASK-MOD-041] Integration with module Y (2h)
  ```
- **Definition of Done** for module
- **Total module estimation**

## Module Documentation Guidelines

1. **Iteration**: If information is missing, ask questions until complete data is obtained
2. **Folder structure**: Use `docs/project/{task_name}/` with shortened module name
3. **Module context**: Always specify how module fits into larger system
4. **Module boundaries**: Clearly define what is and isn't part of the module
5. **Dependencies**: List all dependencies from/to other modules and required adjustments
6. **Naming**: Use module prefixes for easy identification (e.g., AUTH-, PAY-, REP-)
7. **Interfaces**: Precisely describe module's public API
8. **Design System**: Update `docs/project/ui_design_system.md` with all UI elements from module
9. **System Flow**: Update `docs/project/system_flow.md` with flows and integrations
10. **Consistency**: Maintain naming and style conventions common to entire system
11. **Completeness**: Don't create documentation if key information is missing

## Module Examples

Folder structure:
```
docs/
└── project/
    ├── ui_design_system.md      # Shared design system
    ├── system_flow.md           # Inter-module flows
    ├── user-auth/              # Authorization module
    │   ├── requirements.md
    │   ├── design.md
    │   └── tasks.md
    ├── payment-proc/           # Payment module
    │   ├── requirements.md
    │   ├── design.md
    │   └── tasks.md
    └── report-gen/            # Reports module
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

Example module folder names:
- `user-auth` - login, registration, session management
- `payment-proc` - payment processing, invoices
- `notif-service` - email, SMS, push notifications
- `report-gen` - report generation, data export
- `inventory-mgmt` - inventory management
- `order-proc` - order processing

## Input Format

Provide:
1. Module name
2. Module functionality description
3. Dependencies on other modules (if any)
4. Technical/business details
5. Mockups/diagrams (if related to module)
6. UI/UX requirements (if module has user interface)
7. Library and tool preferences

## Result

1. **Module folder**: `docs/project/{task_name}/` containing:
   - `requirements.md` - functional requirements
   - `design.md` - technical documentation with dependencies
   - `tasks.md` - implementation plan

2. **System files update** in `docs/project/` folder:
   - `ui_design_system.md` - updated with UI elements from module
   - `system_flow.md` - updated with module flows and dependencies

3. **Consistent documentation** ready for implementation without additional questions

## Documentation Creation/Update Process

1. **Input analysis** → Check information completeness
2. **Questions** (if needed) → Clarify gaps
3. **Module files creation** → in `docs/project/{task_name}/`
4. **UI Design System update** → add/adjust UI elements
5. **System Flow update** → add flows and dependencies
6. **Consistency verification** → check alignment with entire system

## Iterative Process - IMPORTANT!

### Completeness Analysis
After receiving input information, ALWAYS perform the following steps:

1. **Completeness assessment** - analyze if provided information allows for 100% complete documentation
2. **Gap identification** - find all areas requiring clarification
3. **Question formulation** - if documentation cannot be complete, formulate question list

### Clarifying Questions Format

If information is incomplete, respond in the following format:

```
## Available Information Analysis
✅ What I already know:
- [list of available information]

❌ What's missing for complete documentation:
- [list of missing elements]

## Clarifying Questions for module [NAME]:

### Functional Requirements
1. [Question about missing user stories]
2. [Question about acceptance criteria]
3. [Question about priorities]

### Technical Architecture
4. [Question about technologies]
5. [Question about integrations]
6. [Question about data models]

### Implementation Details
7. [Question about data flow]
8. [Question about error handling]
9. [Question about performance requirements]

### Interfaces and Dependencies
10. [Question about API]
11. [Question about dependencies on other modules]
12. [Question about data formats]

Please answer the above questions so I can create complete documentation.
```

### Documentation Completeness Criteria

Documentation is complete when it contains:

**For requirements.md:**
- [ ] All user stories with acceptance criteria
- [ ] Defined user roles
- [ ] Determined functionality priorities
- [ ] Clear module boundaries
- [ ] Dependencies from/to other modules

**For design.md:**
- [ ] Complete technology stack
- [ ] All data models with types
- [ ] Complete API (endpoints, request/response)
- [ ] Data flow and operation sequences
- [ ] Error handling strategy
- [ ] Testing plan
- [ ] **Impact analysis on other modules**
- [ ] **List of required system adjustments**

**For tasks.md:**
- [ ] All implementation tasks
- [ ] Realistic time estimates
- [ ] Dependencies between tasks
- [ ] Implementation order
- [ ] Definition of Done

**For ui_design_system.md (in docs/project/):**
- [ ] Consistency with existing guidelines
- [ ] All new UI components from module
- [ ] Light/dark mode versions

**For system_flow.md (in docs/project/):**
- [ ] Module dependencies
- [ ] Data flows
- [ ] Integration points

### Iterations

1. **First iteration**: Input analysis and question list
2. **Subsequent iterations**: Documentation supplementation with new information
3. **Finalization**: When all information is complete, create final documentation

**NOTE**: Continue asking clarifying questions until you can create documentation that allows the development team to implement the module without additional questions.

### Iterative Process Example

**Input**: "Create documentation for authorization module"

**AI Response**:
```
## Available Information Analysis
✅ What I already know:
- Module name: authorization

❌ What's missing:
- Authorization methods
- User roles
- Technologies
- Integrations
- Security requirements
- User interface

## Clarifying questions:
1. What authorization methods should the module support? (email/password, OAuth, 2FA?)
2. What user roles exist in the system?
3. Does the module have its own database or use a shared one?
4. What are the UI requirements? (login screen, registration, password recovery?)
5. Are we using a specific UI library or creating custom components?
6. What should the authorization flow look like from user perspective?
7. What other modules will use authorization?
[...]
```

After receiving answers, AI continues the process until all information is obtained.

## Process Summary

1. **Receive information** → Analyze completeness
2. **If incomplete** → List of clarifying questions
3. **Receive answers** → Re-analyze
4. **Repeat** until all checklists are complete
5. **Create documentation** → Three files in `docs/project/{task_name}/`
6. **Update design system** → Add UI elements to `docs/project/ui_design_system.md` if needed
7. **Update flows** → Add dependencies to `docs/project/system_flow.md`
8. **Verify consistency** → Check alignment with entire system

**Remember**: 
- The goal is to create documentation that allows a developer to implement the module without asking additional questions
- Design system must be consistent and aligned with latest UX/UI trends
- Each module must clearly specify its impact on other system parts