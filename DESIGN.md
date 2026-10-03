# Viewer design

The user's Cult UI screenshot is the visual authority: near-black background, restrained neutral borders, plain component title, compact controls and generous preview space. Cult UI itself is not required.

Use the supplied Ruixen expandable menu navbar and magnetic tabs. Keep the Fumadocs code block with copy support. Code and Preview panels share a fixed Tailwind height (544px desktop / 448px mobile); source scrolls in both directions without shrinking. Use Lineicons for framework labels and preview controls. The supplied Tailark files remain unused references.

`site/src/styles/global.css` contains only Tailwind/Fumadocs imports, source paths, and semantic theme tokens in OKLCH. Page and component visuals belong in Tailwind classes on their elements; avoid selectors, `!important`, hardcoded hex colors, and unexplained offsets. Dynamic inline styles are reserved for measured motion positions and syntax-highlight token colors. UI type is the system sans stack; source uses monospace. Honor reduced motion. Each component preview gets an iframe so its CSS cannot alter the viewer.

The home page is a compact list of four sections with `Kbd.tsx` shortcut caps: Components (A), Snippets (S), Web Tools (D) and Shaders (F). The expanded menu uses a full-viewport backdrop and links to the four sections. `/components/` lists frameworks with monospace component counts, and `/components/react/` (likewise Vue, Svelte and Solid) lists that framework’s components. `/tools/` and `/snippets/` are placeholders. Component detail and preview routes live below `/components/<framework>/<name>/`.

`kuit init` extracts this UI without the repository's example component bundles or their routes. Empty component indexes show a concise import command while keeping all framework links available. The home list and menu mark Snippets and Web Tools as “Soon”; their pages remain simple placeholders with a route back to Components.

Shaders use the same index, breadcrumb, Preview and Code patterns at `/shaders/` and `/shaders/<name>/`. HTML entries run in iframes; there is no Props tab. The built-in Dither Canvas keeps its palette and playback controls inside its standalone preview. Its CSS is generated from Tailwind utilities and the viewer’s semantic theme; do not hand-edit the generated file. New viewers include the shader example.

Viewer toolbars share a 16px horizontal gutter and 36px control height. Ruixen Button Dropdown selects use visible selected values, listbox keyboard navigation and semantic colors. File selection, count and copy share one row; code scrolls below it without a repeated filename header. The portable shader mirrors this dropdown using plain JavaScript.
