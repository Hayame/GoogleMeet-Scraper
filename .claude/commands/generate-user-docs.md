# Universal Prompt for AI-Generated User Documentation

## Prerequisites Check
Before starting, verify that Playwright MCP is properly configured and available:
1. Check if Playwright MCP server is running
2. Verify connection to Playwright MCP
3. **If Playwright MCP is NOT configured**: 
   - Immediately inform the user: "⚠️ Playwright MCP is not configured or not accessible. Please install and configure Playwright MCP to generate screenshots. Documentation will be created without screenshots."
   - Continue with documentation generation but skip screenshot generation steps
   - Add placeholders for screenshots with descriptions of what should be captured

## Task
Analyze the application source code located at: `$ARGUMENTS` and create comprehensive user documentation with screenshots using Playwright MCP.

## Documentation Requirements

### 1. Document Structure
- **Title Page** with application name, version, and creation date
- **Interactive Table of Contents** 
  - Must include ALL sections and subsections
  - Each entry must be a clickable link using markdown anchors
  - Format: `[Section Name](#section-name)`
  - Include page numbers or section numbers (e.g., 1.1, 1.2, 2.1)
  - Maximum 3 levels of hierarchy
  - Example structure:
    ```markdown
    ## Table of Contents
    1. [Introduction](#introduction)
    2. [Getting Started](#getting-started)
       2.1 [System Requirements](#system-requirements)
       2.2 [Installation](#installation)
    3. [User Guide](#user-guide)
       3.1 [Account Creation](#account-creation)
       3.2 [Login Process](#login-process)
    ```
- **Introduction** - brief description of the application and its main purpose
- **System Requirements** (if determinable from code)
- **User Guide** divided into logical sections
- **FAQ** - frequently asked questions
- **Glossary** (if technical terms are used)
- **Index** - alphabetical list of all features with links

### 2. User Guide Content

#### Process Flow Order
Analyze the application and organize features in logical user journey order:
1. **Initial Setup**
   - Account creation/registration process
   - Email verification (if applicable)
   - Initial configuration

2. **Authentication**
   - Login process
   - Password recovery
   - Two-factor authentication (if available)

3. **Core Features**
   - Main dashboard/home screen overview
   - Primary functionalities (in order of typical usage)
   - Secondary features
   - Settings and preferences

4. **Advanced Features**
   - Power user features
   - Integrations
   - API usage (if applicable)

5. **Account Management**
   - Profile settings
   - Data export/import
   - Account deletion

### 3. Use Case Documentation

For EACH identified feature, create a detailed use case following this template:

```markdown
## Use Case: [Feature Name]

### Overview
Brief description of what this feature does and when to use it.

### Prerequisites
- List any required conditions
- Previous steps that must be completed
- Required permissions or roles

### Step-by-Step Process
1. **Step 1**: [Action description]
   - Screenshot: [screenshot_feature_step1.png]
   - Important notes or tips
   
2. **Step 2**: [Action description]
   - Screenshot: [screenshot_feature_step2.png]
   - What to expect after this action
   
[Continue for all steps...]

### Expected Result
Description of successful completion

### Troubleshooting
Common issues and their solutions
```

### 4. Screenshot Requirements

Using Playwright MCP, capture screenshots for:
- **Every major screen** in the application
- **Each step** in critical processes (registration, login, main features)
- **Error states** and validation messages
- **Success confirmations**
- **Different user roles/views** (if applicable)

Screenshot naming convention: `[section]_[feature]_[step].png`
Example: `auth_login_form.png`, `dashboard_main_view.png`

### 5. Technical Analysis Instructions

When analyzing the source code at `$ARGUMENTS`, identify:

1. **All user-facing routes/pages**
   - Extract from routing configuration
   - Identify public vs. authenticated routes

2. **Forms and input fields**
   - Required vs. optional fields
   - Validation rules
   - Error messages

3. **User interactions**
   - Buttons and their actions
   - Navigation elements
   - Interactive components

4. **API endpoints** (if relevant for user understanding)
   - What data can be accessed
   - Rate limits or restrictions

5. **Configuration options**
   - User preferences
   - Customizable features
   - Theme/language options

### 6. Documentation Format

Generate the documentation in Markdown format with:
- Clear hierarchical structure (# ## ### headings)
- Inline images for screenshots: `![Description](path/to/screenshot.png)`
- Code blocks for any technical examples
- Tables for comparing features or options
- Internal links for navigation

### 7. Quality Checklist

Ensure the documentation includes:
- [ ] Complete table of contents
- [ ] All features discovered in the code are documented
- [ ] Screenshots for every major interaction
- [ ] Clear step-by-step instructions
- [ ] No assumptions about user technical knowledge
- [ ] Consistent terminology throughout
- [ ] Index of all features with page references

### 8. Playwright MCP Integration

For screenshot generation, use these Playwright commands:
```javascript
// Navigate to page
await page.goto('[URL]');

// Take screenshot
await page.screenshot({ 
  path: '[section]_[feature]_[step].png',
  fullPage: true 
});

// For specific elements
await page.locator('[selector]').screenshot({ 
  path: 'element_screenshot.png' 
});

// Capture different states
// - Default state
// - Hover state
// - Active/clicked state
// - Error state
// - Success state
```

### 9. Output Structure

```
user-documentation/
├── README.md (main documentation file)
├── screenshots/
│   ├── auth/
│   │   ├── login_form.png
│   │   ├── registration_step1.png
│   │   └── ...
│   ├── dashboard/
│   │   └── ...
│   └── features/
│       └── ...
└── assets/
    └── (any additional resources)
```

## Execution Steps

1. **Parse and analyze** all files in `$ARGUMENTS`
2. **Identify** all user-facing features and workflows
3. **Map** the complete user journey from first interaction to advanced usage
4. **Generate** screenshots for each identified screen/state using Playwright MCP
5. **Write** comprehensive documentation following the structure above
6. **Validate** that all code-discovered features are documented
7. **Create** the final documentation package with all screenshots embedded

## Final Notes
- **IMPORTANT**: First check Playwright MCP availability before starting documentation
- Focus on what users can DO, not how the code works
- Use simple, non-technical language where possible
- Include real-world examples and scenarios
- Ensure documentation is scannable with clear headings and visual breaks
- Test all documented procedures to ensure accuracy
- All internal links in Table of Contents must be functional and tested
- If screenshots cannot be generated due to missing Playwright MCP, create detailed text descriptions of UI elements