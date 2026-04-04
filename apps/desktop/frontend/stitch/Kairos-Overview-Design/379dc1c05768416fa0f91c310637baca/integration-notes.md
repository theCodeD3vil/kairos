# Kairos Overview - macOS Pro Concept 2

## Artifacts
- `screenshot.png`: downloaded from Stitch.
- `screen.json`: Stitch metadata with source URLs.
- `screen.reconstructed.tsx`: reconstructed React/Tailwind screen code.

## Component Source Requirements
- Non-chart UI uses project-local shadcn-style primitives under `@/components/ui/*`.
- Source docs requested by user: `https://ui.justinlevine.me/docs`.

## Chart Requirement
- The velocity panel in `screen.reconstructed.tsx` includes a fallback bar implementation and a replacement comment for Blitz chart wiring.
- Requested docs URL: `https://blitz-charts.vercel.app/docs/installation`.

## Current Blocker
- `blitz-charts.vercel.app` could not be resolved from this environment.
- `pnpm view blitz-charts` returns `E404` (package unpublished as of 2025-06-16), so exact package import name could not be confirmed automatically.

## Next Wiring Step
Once the correct Blitz package/import is confirmed, replace the fallback bars in `screen.reconstructed.tsx` with the Blitz chart component in the `Development Velocity` card.
