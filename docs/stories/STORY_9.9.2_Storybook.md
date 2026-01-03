# Story 9.9.2: Component Storybook (Visual Documentation)

**Epic:** [EPIC 9.9: Documentation & Developer Experience](../epics/EPIC_9.9_Documentation_DX.md)  
**Priority:** 🔴 Critical  
**Estimated Time:** 2 days  
**MCP Usage:** 🎨 Shadcn MCP (Medium)  
**Dependencies:** Epics 9.1-9.8  
**Status:** 📋 Planning

---

## 📋 Story Description

Create comprehensive Storybook documentation for all UI components in the Friends Module, including interactive controls, accessibility testing, and visual regression testing.

---

## ✅ Acceptance Criteria

### Storybook Setup

- [ ] Storybook 7+ installed and configured
- [ ] All Friends UI components have stories
- [ ] Stories for all component states (loading, error, empty, populated)
- [ ] Interactive controls (Storybook controls addon)
- [ ] Accessibility testing (a11y addon)

### Component Coverage

- [ ] FriendsList component (5+ stories)
- [ ] FriendCard component (5+ stories)
- [ ] FriendRequestCard component (5+ stories)
- [ ] FriendProfileModal component (3+ stories)
- [ ] FriendPickerModal component (3+ stories)
- [ ] FriendLeaderboard component (3+ stories)
- [ ] All supporting components

### Deployment

- [ ] Storybook deployed to Chromatic or GitHub Pages
- [ ] Automatic updates on PR
- [ ] Visual regression testing enabled

---

## 🎨 Implementation

### Phase 1: Storybook Setup (2 hours)

**Install Storybook:**

```bash
npx storybook@latest init
npm install --save-dev @storybook/addon-a11y
npm install --save-dev @storybook/addon-interactions
npm install --save-dev chromatic
```

**Configure `.storybook/main.ts`:**

```typescript
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
```

**Configure `.storybook/preview.ts`:**

```typescript
import type { Preview } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import '../src/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
};

export default preview;
```

---

### Phase 2: Core Component Stories (6 hours)

**FriendCard.stories.tsx:**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { FriendCard } from "./FriendCard";

const meta: Meta<typeof FriendCard> = {
  title: "Friends/FriendCard",
  component: FriendCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onMessage: { action: "message clicked" },
    onUnfriend: { action: "unfriend clicked" },
  },
};

export default meta;
type Story = StoryObj<typeof FriendCard>;

export const Default: Story = {
  args: {
    friend: {
      id: "1",
      full_name: "John Doe",
      username: "johndoe",
      avatar_url: "https://i.pravatar.cc/150?u=johndoe",
      is_online: true,
      mutual_friends_count: 5,
    },
  },
};

export const Offline: Story = {
  args: {
    friend: {
      ...Default.args.friend!,
      is_online: false,
    },
  },
};

export const NoAvatar: Story = {
  args: {
    friend: {
      ...Default.args.friend!,
      avatar_url: null,
    },
  },
};

export const LongName: Story = {
  args: {
    friend: {
      ...Default.args.friend!,
      full_name: "Alexander Christopher Montgomery III",
    },
  },
};

export const NoMutualFriends: Story = {
  args: {
    friend: {
      ...Default.args.friend!,
      mutual_friends_count: 0,
    },
  },
};
```

**FriendRequestCard.stories.tsx:**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { FriendRequestCard } from "./FriendRequestCard";

const meta: Meta<typeof FriendRequestCard> = {
  title: "Friends/FriendRequestCard",
  component: FriendRequestCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FriendRequestCard>;

export const ReceivedPending: Story = {
  args: {
    request: {
      id: "1",
      sender: {
        id: "user-123",
        full_name: "Jane Smith",
        username: "janesmith",
        avatar_url: "https://i.pravatar.cc/150?u=janesmith",
      },
      status: "pending",
      created_at: new Date().toISOString(),
      type: "received",
    },
  },
};

export const SentPending: Story = {
  args: {
    request: {
      ...ReceivedPending.args.request!,
      type: "sent",
    },
  },
};

export const Loading: Story = {
  args: {
    request: ReceivedPending.args.request!,
    isLoading: true,
  },
};

export const WithMutualFriends: Story = {
  args: {
    request: {
      ...ReceivedPending.args.request!,
      sender: {
        ...ReceivedPending.args.request!.sender,
        mutual_friends_count: 12,
      },
    },
  },
};
```

**FriendsList.stories.tsx:**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { FriendsList } from "./FriendsList";

const meta: Meta<typeof FriendsList> = {
  title: "Friends/FriendsList",
  component: FriendsList,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FriendsList>;

const mockFriends = Array.from({ length: 10 }, (_, i) => ({
  id: `user-${i}`,
  full_name: `Friend ${i}`,
  username: `friend${i}`,
  avatar_url: `https://i.pravatar.cc/150?u=friend${i}`,
  is_online: i % 2 === 0,
  mutual_friends_count: Math.floor(Math.random() * 20),
}));

export const Default: Story = {
  args: {
    friends: mockFriends,
    isLoading: false,
  },
};

export const Loading: Story = {
  args: {
    friends: [],
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    friends: [],
    isLoading: false,
  },
};

export const Error: Story = {
  args: {
    friends: [],
    isLoading: false,
    error: new Error("Failed to load friends"),
  },
};

export const WithSearch: Story = {
  args: {
    friends: mockFriends,
    isLoading: false,
    searchQuery: "Friend 1",
  },
};
```

---

### Phase 3: Modal Stories (3 hours)

**FriendProfileModal.stories.tsx:**

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { FriendProfileModal } from "./FriendProfileModal";

const meta: Meta<typeof FriendProfileModal> = {
  title: "Friends/FriendProfileModal",
  component: FriendProfileModal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FriendProfileModal>;

export const Desktop: Story = {
  args: {
    friend: {
      id: "1",
      full_name: "John Doe",
      username: "johndoe",
      avatar_url: "https://i.pravatar.cc/300?u=johndoe",
      is_online: true,
      mutual_friends_count: 15,
      bio: "Love finding great deals!",
    },
    isOpen: true,
  },
};

export const Mobile: Story = {
  args: Desktop.args,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export const NoBio: Story = {
  args: {
    ...Desktop.args,
    friend: {
      ...Desktop.args.friend!,
      bio: null,
    },
  },
};
```

---

### Phase 4: Accessibility Testing (2 hours)

**Add a11y tests to all stories:**

```typescript
// In each story file
export const AccessibilityTest: Story = {
  args: Default.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Run accessibility checks
    await expect(canvas.getByRole("button")).toBeInTheDocument();
  },
};
```

---

### Phase 5: Deploy to Chromatic (3 hours)

**Add Chromatic:**

```bash
npm install --save-dev chromatic
```

**Create `.github/workflows/chromatic.yml`:**

```yaml
name: Chromatic

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Publish to Chromatic
        uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook
```

**Add npm scripts:**

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "chromatic": "chromatic --exit-zero-on-changes"
  }
}
```

---

## 🎯 MCP Integration

### Shadcn MCP Commands

```bash
# Generate story for a component
warp mcp run shadcn "create storybook story for FriendCard component"

# Add accessibility tests
warp mcp run shadcn "add a11y tests to FriendsList stories"

# Generate all component states
warp mcp run shadcn "create stories for all states of FriendRequestCard"
```

---

## 📦 Deliverables

1. **Storybook Configuration:**
   - `.storybook/main.ts`
   - `.storybook/preview.ts`

2. **Component Stories:**
   - FriendCard.stories.tsx
   - FriendRequestCard.stories.tsx
   - FriendsList.stories.tsx
   - FriendProfileModal.stories.tsx
   - FriendPickerModal.stories.tsx
   - FriendLeaderboard.stories.tsx

3. **Deployment:**
   - Chromatic integration
   - GitHub Actions workflow
   - Deployed Storybook site

---

## 📈 Success Metrics

- **Component Coverage:** 100% (all UI components)
- **Stories per Component:** 5+ average
- **Accessibility Score:** 100% (no violations)
- **Visual Regression Tests:** Enabled
- **Build Time:** < 2 minutes

---

**Next Story:** [STORY 9.9.3: Migration Guide](./STORY_9.9.3_Migration_Guide.md)
