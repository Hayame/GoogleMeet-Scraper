# good-practices-react-vite

Enforce React + Vite best practices and testing discipline.

## Matches

- \*.tsx
- \*.ts
- \*.jsx
- \*.js

## On Save

### ✅ React + Vite Best Practices

- Use functional components and hooks (no class components)
- Split large components into smaller, reusable pieces
- Co-locate logic: keep related state, functions, and markup together
- Avoid inline functions in JSX if they cause re-renders
- Use `useCallback`, `useMemo` wisely to optimize performance
- Prefer `useEffect` with clear cleanup logic if side effects exist
- Organize files by feature (not by type) for scalability
- Use environment variables via `import.meta.env` (not `process.env`)
- Avoid hardcoded API URLs or secrets – use `.env` and Vite config
- Keep component props and state minimal – lift state only when needed

### 🧪 Testing & Code Quality

- If the code contains logic worth testing (conditions, branches, edge cases), write a unit or component test
- Use `vitest` + `@testing-library/react` for unit and component tests
- Mock external services and hooks when needed
- Prefer testing user behavior over internal implementation details
- Keep tests in `__tests__` or colocated `*.test.tsx` files