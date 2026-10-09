# estiak.me

Portfolio of Md. Estiak Ahmed. Astro + React islands + Tailwind v4 + shadcn/ui, deployed to GitHub Pages.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # astro check + static build to dist/
npm run lint
npm run format
```

- Content: `src/data/site-data.ts` (no copy lives in markup)
- Images: `src/assets/` (optimised by `astro:assets`), static files in `public/`
- shadcn/ui: `npx shadcn@latest add <component>` (config in `components.json`)
- Deploy: `.github/workflows/deploy.yml` on push to `main`. Pages source must be set to **GitHub Actions**.
- `legacy/`: the 2022 site, kept for reference until cutover.
