# Tin Tin — Portfolio

Portfolio site for Tin Tin, a designer applying to creative agencies. Splatoon-inspired visual style: bold diagonal stripes, ink-splat accents, and a real 3D product-box hero built with Three.js.

## Tech stack

- Vite + React 19 + TypeScript, CSS Modules
- GSAP for 2D/DOM animation (entrance sequences, badge/text pop-ins)
- React Three Fiber + drei + three.js for the 3D product box (lazy-loaded)
- vite-plugin-svgr for `?react` SVG imports
- oxlint for linting

## Scripts

```bash
npm run dev     # start the dev server (port 5173)
npm run build   # type-check (tsc -b) + production build
npm run lint    # oxlint
npm run preview # preview the production build locally
```

## Structure

```
src/
  components/
    hero/          Hero section: layout, decorative elements, 3D box scene,
                   and the Hero->About liquid scroll transition
    about/         About section: FIGURE X1, UR CARD X1, BATTLE HISTORY
    StripedBackground.tsx   Reusable animated diagonal-stripe background (SVG pattern, not CSS gradient — see comments in the file for why)
    Navbar.tsx
  hooks/
  styles/          Design tokens (tokens.css) and global styles
  assets/svg/      Icon and decorative SVG assets (kebab-case filenames)
  assets/images/   Raster art (rider photo, trading card faces)
public/
  models/          3D box GLB model
```

## Status

Hero (incl. the 3D box and the Hero->About liquid transition) and About are complete, with a full mobile pass on both. Work and Contact sections are not started yet.
