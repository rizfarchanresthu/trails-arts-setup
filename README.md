# Trails Arts Gallery

A web tool for planning **orbment** (quartz) setups from the *Trails* (*Kiseki*) RPG series. Equip quartz and master quartz, configure lines and slot restrictions, and see which **arts** your setup unlocks — using game-accurate element totals and rule sets.

## Supported games

- Trails in the Sky FC / SC / the 3rd
- Trails from Zero / to Azure
- Trails of Cold Steel I–IV
- Trails into Reverie

Character presets, quartz catalogs, master quartz, and arts data are stored per game under `src/database/`.

## Features

- Interactive orbment configurator with game-specific topologies and rules
- Quartz and master quartz pickers
- Live arts evaluation from your equipped setup
- Save, load, import, and export setups in the browser

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | [React](https://react.dev/) 19 |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Build / dev | [Vite](https://vite.dev/) 8 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4 |
| Components | [shadcn/ui](https://ui.shadcn.com/) (built on [Base UI](https://base-ui.com/)) |
| Icons | [Lucide](https://lucide.dev/) |
| Selects | [react-select](https://react-select.com/) |
| Lint | [Oxlint](https://oxc.rs/docs/guide/usage/linter) |
| Font | Cuprum Variable (default); Geist Variable via in-app toggle |

Game data lives as static JSON. Domain logic (arts evaluation, rule sets, presets) sits in `src/domain/`; UI state for the orbment and saved setups is in `src/state/`.

## Getting started

```bash
npm install
npm run dev
```

Other scripts:

```bash
npm run build    # typecheck + production build
npm run preview  # serve the production build
npm run lint     # run Oxlint
```
