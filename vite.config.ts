import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        svgo: true,
        // `svgo:true`/`svgoConfig` alone do NOT make svgo actually run —
        // vite-plugin-svgr only bundles `@svgr/core` + `@svgr/plugin-jsx`
        // as its own dependencies; the svgo integration lives in a
        // SEPARATE package, `@svgr/plugin-svgo`, which was never
        // installed here. This means the svgoConfig below (and its
        // prefixIds fix, see next paragraph) was silently a complete
        // no-op since this project's inception — confirmed by directly
        // invoking `@svgr/core`'s `transform()` the same way this plugin
        // does and seeing zero difference from the raw input. Installed
        // `@svgr/plugin-svgo` and listed it explicitly here — providing
        // `plugins` replaces svgr-core's default pipeline entirely, so
        // both the svgo step AND the jsx step must be listed.
        plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
        // These Illustrator exports all reuse generic class/id names
        // (.st0, .st1, id="clippath", ...). Inlining more than one on the
        // same page lets their <style> blocks collide globally (SVG
        // <style> isn't scoped), corrupting colors across unrelated
        // icons — confirmed live (an ink splat's own `.st0{fill:#ffe600}`
        // rule got silently overridden by an unrelated SVG's own
        // `.st0{fill:none}` landing later in the DOM). `prefixIds` gives
        // each file's classes/ids a unique random prefix per svgo run
        // (one run per imported file), which stops the collision.
        // `mergePaths` AND `inlineStyles` both have to be disabled
        // alongside it, or preset-default's default `mergePaths` step
        // merges every element sharing that class into ONE path and
        // silently drops the class reference in the process (confirmed:
        // with either one left enabled, the merged path ends up with a
        // dangling `<style>` rule that targets nothing — no class, no
        // fill, invisible). Tested directly against `@svgr/core`'s own
        // `transform()` (bypassing Vite entirely) before landing on this
        // combination — see project-work-contact-status memory for the
        // fuller debugging trail if this needs revisiting.
        svgoConfig: {
          plugins: [
            {
              name: 'preset-default',
              params: { overrides: { removeViewBox: false, mergePaths: false, inlineStyles: false } },
            },
            { name: 'prefixIds' },
          ],
        },
      },
    }),
  ],
})
