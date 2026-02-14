React + Vite Numeric Best Practices
File: rules.mdc

Code & Structure (React)
	•	Maximum component file length: ≤ 300 lines
	•	Maximum number of props per component: 10
	•	Maximum number of components in a single file: 3
	•	Maximum JSX nesting depth: 3 levels
	•	Maximum number of hooks in a component: 7
	•	Minimum variable/function name length: 3 characters
	•	Use of any in the project: 0 (or explicitly justified)

Hooks & State
	•	Maximum number of useEffect hooks per component: 3
	•	Logic repeated ≥ 2 times should be extracted into a custom hook
	•	Maximum number of Context usages per component: 2
	•	Component render time (DevTools): < 16ms

Vite & Performance
	•	Maximum dev server startup time: < 5s
	•	Maximum initial bundle size (gzipped): < 250 KB
	•	Maximum number of Vite plugins: 5
	•	Inline assets smaller than 10 KB
	•	No static assets larger than 500 KB

Styling & UI
	•	Maximum number of Tailwind/CSS classes on a single element: < 10
	•	Maximum number of global CSS classes: < 20
	•	Number of fonts/types in the UI: 1–2

Testing & Quality
	•	Minimum test coverage (UI logic): ≥ 90%
	•	Maximum ESLint errors: 0
	•	Unit test execution time: < 10s
	•	console.log in production code: 0

CI/CD & Security
	•	Number of steps in CI (lint, test, build): ≥ 3
	•	Maximum open ports for dev server: 1
	•	Dependencies with latest in package.json: 0 (all versions pinned)
	•	.gitignore coverage for sensitive files (.env): 100%
