# Viewer design

The user's Cult UI screenshot is the visual authority: near-black background, restrained neutral borders, plain component title, compact controls and generous preview space. Cult UI itself is not required.

Use the supplied Ruixen expandable menu navbar and magnetic tabs. Keep the Fumadocs code block with copy support. Code and Preview panels share a fixed Tailwind height (544px desktop / 448px mobile); source scrolls in both directions without shrinking. Use Lineicons for framework labels and preview controls. The supplied Tailark files remain unused references.

`site/src/styles/global.css` contains only Tailwind/Fumadocs imports, source paths, and semantic theme tokens in OKLCH. Page and component visuals belong in Tailwind classes on their elements; avoid selectors, `!important`, hardcoded hex colors, and unexplained offsets. Dynamic inline styles are reserved for measured motion positions and syntax-highlight token colors. UI type is the system sans stack; source uses monospace. Honor reduced motion. Each component preview gets an iframe so its CSS cannot alter the viewer.

The home page is a compact list of three sections with `Kbd.tsx` shortcut caps: Components (A), Snippets (S) and Web Tools (D). The expanded menu uses a full-viewport backdrop and links to the three sections. `/components/` lists frameworks with monospace component counts, and `/components/react/` (likewise Vue, Svelte and Solid) lists that framework’s components. `/tools/` and `/snippets/` are placeholders. Component detail and preview routes live below `/components/<framework>/<name>/`.
