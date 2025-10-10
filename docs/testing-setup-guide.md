# Frontend Testing Setup Guide

## Testing Stack

We'll use the following tools:
- **Vitest** - Fast unit test runner (Vite-native)
- **React Testing Library** - Component testing
- **MSW (Mock Service Worker)** - API mocking
- **Playwright** - E2E testing (optional)

---

## Step 1: Install Testing Dependencies

Run these commands in PowerShell:

```powershell
# Core testing libraries
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Additional testing utilities
npm install -D @testing-library/react-hooks msw happy-dom

# Type definitions
npm install -D @types/testing-library__jest-dom
```

Or all at once:
```powershell
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event @testing-library/react-hooks msw happy-dom @types/testing-library__jest-dom
```

---

## Step 2: Configure Vitest

Update or create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/'
      ]
    }
  }
});
```

---

## Step 3: Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

---

## Step 4: Verify Installation

After installing, verify with:

```powershell
npm run test -- --version
```

---

## Directory Structure

```
src/
├── components/
│   ├── campaigns/
│   │   ├── CampaignCard.tsx
│   │   └── __tests__/
│   │       └── CampaignCard.test.tsx
│   ├── drivers/
│   └── shared/
├── hooks/
│   ├── useDrivers.ts
│   └── __tests__/
│       └── useDrivers.test.ts
├── services/
│   ├── driverService.ts
│   └── __tests__/
│       └── driverService.test.ts
└── test/
    ├── setup.ts
    ├── utils.tsx
    └── mocks/
        ├── handlers.ts
        └── data.ts
```

---

## Quick Start

Once setup is complete:

1. **Run all tests**:
   ```powershell
   npm test
   ```

2. **Run tests with UI**:
   ```powershell
   npm run test:ui
   ```

3. **Run specific test file**:
   ```powershell
   npm test CampaignCard
   ```

4. **Generate coverage report**:
   ```powershell
   npm run test:coverage
   ```

---

## Next Steps

After completing the setup:
1. Create test setup file (`src/test/setup.ts`)
2. Create test utilities (`src/test/utils.tsx`)
3. Create mock data (`src/test/mocks/data.ts`)
4. Write component tests
5. Write hook tests
6. Write service tests

---

## Troubleshooting

### Issue: Module not found
**Solution**: Check path aliases in `vite.config.ts`

### Issue: Tests timeout
**Solution**: Increase timeout in test file:
```typescript
test('my test', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Issue: Mock not working
**Solution**: Ensure MSW handlers are properly configured in setup file

---

## Resources

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [MSW Docs](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
