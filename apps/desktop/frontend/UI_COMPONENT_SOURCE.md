# UI Component Source Policy

Frontend UI components for `apps/desktop/frontend` must come from JolyUI unless explicitly overridden by the user.

## Approved Source

- JolyUI registry URL: `https://jolyui.dev/r/{name}`
- LLM reference: `apps/desktop/frontend/docs.jolyui.llms-full.txt`

## Add Components

```bash
pnpm dlx shadcn@latest add "https://jolyui.dev/r/<component-name>"
```

Examples:

```bash
pnpm dlx shadcn@latest add "https://jolyui.dev/r/button"
pnpm dlx shadcn@latest add "https://jolyui.dev/r/vercel-tabs"
```
