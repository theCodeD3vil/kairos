# UI Component Source Policy

Frontend UI components for `apps/web` must come from JolyUI unless explicitly overridden by the user.

## Approved Source

- JolyUI registry URL: `https://jolyui.dev/r/{name}`

## Add Components

```bash
pnpm dlx shadcn@latest add "https://jolyui.dev/r/<component-name>"
```
