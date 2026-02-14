# Prompt: Design System Showcase Page Generator

## Task
Create a complete showcase page presenting UI components based on the provided design system file and layout guidelines.

**Required files**:
1. Design system specification: `docs/project/ui_design_system.md`
2. Layout guidelines: `docs/project/design_system_web_layout.md` - contains comprehensive specifications for page structure, navigation, component presentation, and all required features

**Note**: If `$ARGUMENTS` is provided, it contains the technology stack description to use for the project (e.g., "Vue 3 + Vuetify", "Angular + Material", "React + MUI"). Otherwise, use React + Vite + shadcn/ui as the default stack.

**IMPORTANT**: 
- Always use the LATEST versions of all libraries and frameworks
- If Context7 MCP is available, use it to fetch the most recent documentation and best practices
- Verify version compatibility before installation
- Document all dependency versions used
- The created page MUST be 100% compliant with both the design system specification and layout guidelines
- All page structure, navigation, and features must follow `design_system_web_layout.md` exactly

## Steps to complete:

### 0. Documentation and version check
**CRITICAL**: This is a mandatory first step before any implementation
- If Context7 MCP is available:
  - Query for the latest documentation of the chosen technology stack
  - Check for recent updates, breaking changes, and best practices
  - Verify compatibility between different libraries
  - Get the most recent component patterns and examples
  - Check for any security updates or critical patches
- Always ensure using the latest stable versions of all packages
- Check npm/yarn for the most recent releases
- Document all versions used in the project

**COMPLIANCE WARNING**: Every step must ensure 100% compliance with both:
- `docs/project/ui_design_system.md` - design specifications
- `docs/project/design_system_web_layout.md` - complete page structure, features, and layout specifications

### 1. Technology stack setup
- Check if `$ARGUMENTS` is provided with technology stack description
- If `$ARGUMENTS` is provided: use the specified technology stack (overrides defaults)
- If not provided, use default: **React + Vite + shadcn/ui**

**Version Requirements**:
- ALWAYS use the latest stable versions of all dependencies
- Check for the most recent releases on npm
- Use `@latest` tag in all npm/yarn install commands
- If Context7 MCP is available, use it to:
  - Fetch the latest documentation
  - Get current best practices
  - Check for breaking changes in recent versions
  - Verify compatibility between dependencies
  - Find the newest component patterns and APIs

For React + Vite + shadcn/ui, initialize with:
```bash
npm create vite@latest design-system -- --template react-ts
cd design-system
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install -D @types/node path

# Configure vite.config.ts for path aliases:
# Add to vite.config.ts:
# import path from "path"
# resolve: {
#   alias: {
#     "@": path.resolve(__dirname, "./src"),
#   },
# }

# Update tsconfig.json:
# "compilerOptions": {
#   "paths": {
#     "@/*": ["./src/*"]
#   }
# }

# Create/update src/styles/globals.css:
# @tailwind base;
# @tailwind components;
# @tailwind utilities;
# 
# Import in src/main.tsx:
# import './styles/globals.css'

# Then initialize shadcn/ui:
npx shadcn-ui@latest init
# Always use @latest when adding components:
npx shadcn-ui@latest add button card input
```
- For other technologies specified in `$ARGUMENTS`, follow their respective setup procedures with latest versions

### 2. Loading the design system files
- Load the primary design system file from `docs/project/ui_design_system.md` (or another location specified by the user)
- **MANDATORY**: Load `docs/project/design_system_web_layout.md` which contains:
  - Comprehensive specifications for the entire showcase page structure
  - All requirements for navigation, layout, and features
  - Detailed component presentation guidelines
  - Interactive features specifications
  - Accessibility and responsive design requirements
  - **Every aspect of what should be on the page is defined in this document**
  
- Analyze `design_system_web_layout.md` to understand:
  - Complete page structure and layout
  - All required sections and their organization
  - Navigation patterns and menu structure
  - Component showcase specifications
  - Interactive features to implement
  - Theme switching requirements
  - Any additional features specified

- Analyze `ui_design_system.md` for:
  - Component definitions
  - Colors and typography
  - Component states (hover, active, disabled)
  - Variants and sizes
  - Themes (light/dark)
  - Brand-specific customizations

- Cross-reference both documents to ensure complete alignment

### 2. Technology selection
Check if `$ARGUMENTS` variable is provided - if yes, it contains the technology stack description to use.

If `$ARGUMENTS` is not provided:
- **Default stack**: React + shadcn/ui
- Ask the user: "Would you like to use the default stack (React + shadcn/ui) or prefer a different technology?"
- If user wants different technology, ask:
  - "Which technology would you like to use for the component page? (e.g., React, Vue, Angular, Vanilla HTML/CSS)"
  - "Would you like to use an existing component library as a base (e.g., shadcn/ui, MUI, Ant Design)? If so, which one?"

Note: When using shadcn/ui, ensure to:
- Set up proper Tailwind CSS configuration
- Use shadcn/ui component structure and patterns
- Follow shadcn/ui theming approach with CSS variables
- Implement components using shadcn/ui primitives where available

### 4. Best practices research
After technology selection, analyze best practices for:
- Component structure in the chosen technology
- Naming conventions
- Code organization
- Accessibility (a11y)
- Responsiveness
- Performance
- Project structure documentation

**Documentation Sources**:
- If Context7 MCP is available, use it to:
  - Access the latest official documentation
  - Find recent tutorials and guides
  - Check for updated patterns and conventions
  - Verify deprecated features to avoid
- Always prioritize official documentation from the last 3 months
- Check for recent major version updates and migration guides
- **All page layout patterns and features are fully defined in `design_system_web_layout.md`**

For React + Vite + shadcn/ui specifically:
- Component composition patterns
- Proper use of forwardRef
- Tailwind CSS utility classes organization
- CSS variables for theming
- Radix UI primitives integration
- TypeScript interfaces and props validation
- Latest shadcn/ui component patterns
- Vite-specific optimizations (code splitting, lazy loading)
- Path aliases configuration in vite.config.ts

### 5. Project structure
Create a project in the `design-system/` folder with the following structure:
```
design-system/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components (if using shadcn)
│   │   └── [custom components by category]
│   ├── styles/
│   │   ├── globals.css          # Global styles and Tailwind imports
│   │   └── themes/              # Theme variations
│   ├── lib/
│   │   └── utils.ts             # Utility functions (cn, etc.)
│   ├── pages/
│   │   └── [showcase pages]
│   ├── hooks/                   # Custom React hooks
│   ├── App.tsx                  # Main app component
│   └── main.tsx                 # Vite entry point
├── public/
├── components.json              # shadcn/ui configuration (if using shadcn)
├── tailwind.config.js           # Tailwind configuration
├── vite.config.ts               # Vite configuration with path aliases
├── tsconfig.json                # TypeScript configuration
├── package.json                 # With exact latest versions
└── README.md                    # Complete documentation with project map
```

**Important**: When creating package.json, always specify exact versions (no ^ or ~) of the latest stable releases to ensure consistency.

### 6. Component implementation
For each component from the design system:
- Create a component following the chosen technology's best practices
- Implement all variants and states
- Add props/attributes for customization
- Ensure accessibility (ARIA labels, roles, keyboard navigation)
- Add usage documentation

When using React + Vite + shadcn/ui:
- Use shadcn/ui CLI to add base components where applicable
- Extend shadcn/ui components to match design system specifications
- Maintain consistent prop interfaces with shadcn/ui patterns
- Use `cn()` utility for className merging
- Implement proper TypeScript types
- Follow shadcn/ui file naming conventions (e.g., button.tsx, card.tsx)
- Use latest API patterns from current shadcn/ui documentation
- Import components using @ alias (e.g., `import { Button } from "@/components/ui/button"`)

### 7. Showcase page
Create a component showcase page that **MUST follow all specifications from `docs/project/design_system_web_layout.md`**.

The layout guidelines document contains comprehensive instructions for:
- Page structure and layout
- Navigation patterns
- Component organization
- Section layouts
- Interactive features
- Theme switching implementation
- Accessibility requirements

When using React + Vite + shadcn/ui, ensure:
- Tailwind CSS is properly configured
- Path aliases are set up in vite.config.ts for @ imports
- All required dependencies are installed (Radix UI, class-variance-authority, etc.)
- Theme uses CSS variables approach compatible with shadcn/ui
- Components follow shadcn/ui patterns for consistency
- **Every aspect of the page follows the exact specifications from `design_system_web_layout.md`**
- Vite build optimizations are configured for production

### 8. Additional features
Implement all additional features as specified in `docs/project/design_system_web_layout.md`.

The layout guidelines document includes specifications for:
- Search functionality
- Interactive features
- View modes
- Code presentation
- Any other features required for a comprehensive design system showcase

### 9. Quality requirements
- **100% compliance with design system** - every detail must match the documentation
- **100% compliance with design_system_web_layout.md** - follow all page structure, navigation, features, and layout specifications exactly
- **Pixel-perfect** - exact reproduction of spacing, sizing, colors
- **Responsiveness** - components must work on all devices as specified
- **Performance** - rendering optimization, lazy loading where possible
- **Accessibility** - WCAG 2.1 AA compliance
- **Cross-browser** - support for modern browsers
- **Latest versions** - all dependencies must use the most recent stable releases
- **No deprecated features** - avoid any deprecated APIs or patterns
- **Complete feature implementation** - all features specified in `design_system_web_layout.md` must be fully functional

### 10. Documentation - README.md
Create a comprehensive README.md file containing:

#### Section 1: Introduction
- Project title and brief description
- Table of contents with links to sections
- Reference to the design system files:
  - `ui_design_system.md` - component specifications
  - `design_system_web_layout.md` - layout guidelines (100% compliance required)

#### Section 2: Quick Start
- Installation instructions
  - For React + Vite + shadcn/ui:
    ```bash
    npm install
    npm run dev
    ```
  - Development server will run on http://localhost:5173
  - Required dependencies will be automatically installed
- Run commands
- Getting started
- How to add new shadcn/ui components:
  ```bash
  npx shadcn-ui@latest add [component-name]
  ```
- Version information:
  - List all major dependencies with their versions
  - Last updated date
  - Compatibility notes

#### Section 3: Project structure
```markdown
## 📁 Project Structure

```
design-system/
├── src/
│   ├── components/              # All UI components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── [...]
│   │   ├── Button/
│   │   │   ├── Button.tsx      # Main component
│   │   │   ├── Button.styles.ts # Component styles
│   │   │   ├── Button.types.ts  # TypeScript types
│   │   │   └── index.ts         # Export
│   │   └── [...]
│   ├── lib/                     # Utility functions
│   │   └── utils.ts            # cn() and other utilities
│   ├── styles/                  # Global styles and variables
│   │   ├── globals.css         # Global CSS and Tailwind imports
│   │   └── themes/             # Theme variations
│   ├── hooks/                  # Custom React hooks
│   ├── pages/                  # Page components
│   ├── App.tsx                 # Main App component
│   └── main.tsx                # Entry point
├── components.json             # shadcn/ui configuration
├── tailwind.config.js          # Tailwind configuration
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── [...]
```
```

#### Section 4: Component map
```markdown
## 🧩 Components

| Component | Location | Variants | Documentation |
|-----------|----------|----------|---------------|
| Button | `src/components/Button/` | primary, secondary, outline | [See](#button) |
| Card | `src/components/Card/` | default, elevated | [See](#card) |
| Input | `src/components/Input/` | text, password, email | [See](#input) |
```

#### Section 5: Quick Links
- **Entry point**: `src/main.tsx`
- **Main App component**: `src/App.tsx`
- **shadcn/ui components**: `src/components/ui/`
- **Utility functions**: `src/lib/utils.ts`
- **Global styles**: `src/styles/globals.css`
- **Tailwind config**: `tailwind.config.js`
- **Vite config**: `vite.config.ts`
- **shadcn/ui config**: `components.json`

#### Section 6: Component documentation
For each component, a separate section with:
- Description
- API/Props
- Usage examples
- Best practices

#### Section 7: Guidelines
- How to add new components
- Naming conventions
- Code standards
- Review process
- **Dependency management**:
  - Always check for updates before adding new features
  - Use `npm outdated` or `yarn outdated` regularly
  - Test thoroughly after any major version updates
  - Keep a changelog of dependency updates

#### Section 8: Project development
- Roadmap
- Known issues
- Contact/support

## Sample questions for the user:
1. "Is the design system file located in the default location `docs/project/ui_design_system.md`?"
2. "Is the layout guidelines file available at `docs/project/design_system_web_layout.md`?"
3. "Would you like to use the default stack (React + Vite + shadcn/ui) or prefer a different technology?"
4. "Should I use Context7 MCP to fetch the latest documentation (if available)?"
5. "Are there any specific browser support requirements?"
6. "Do you need additional features like playground or Storybook?"
7. "Would you like to customize the shadcn/ui theme colors to match your design system?"

## Output
A complete, fully functional project in the `design-system/` folder containing:
- All components from the design system (built with React + Vite + shadcn/ui by default, or technology specified in $ARGUMENTS)
- **100% compliance with both `ui_design_system.md` and `design_system_web_layout.md`**
- Showcase page with all features, structure, and navigation as specified in `design_system_web_layout.md`
- All dependencies using the LATEST stable versions
- Theme implementation as specified in the layout guidelines
- Complete README.md file with:
  - Installation and usage instructions
  - Project map and directory structure
  - Documentation for all components
  - Quick links for fast navigation
  - Version information for all dependencies
  - Reference to both design system files
- All features and functionality as defined in `design_system_web_layout.md`
- Proper configuration files (vite.config.ts, tailwind.config.js, components.json for shadcn/ui, etc.)
- Package.json with exact versions of all dependencies