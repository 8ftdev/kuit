# Kuit

Approved in conversation: Go CLI, Bun helper and package manager, Astro + Fumadocs viewer, React/Vue/Svelte/Solid, read-only prop documentation. Use Cult UI visual conventions and the Ruixen expandable menu navbar. No sidebar or TOC.

`kuit config set target /absolute/viewer` saves a destination. `kuit <origin> <framework> [name]` copies a component with transitive local imports, styles and assets into `<target>/<framework>/<name>/`. Name defaults to the source basename. A generated Astro page exposes `/<framework>/<name>`.

Go validates arguments and invokes an embedded Bun helper. The helper uses Vite resolution plus TypeScript/framework parsers to preserve source and rewrite local imports. Files are flattened with deterministic suffixes for collisions. Package imports remain external; their versions are recorded and added to the target manifest without overwriting conflicting versions. Bun installs dependencies explicitly via `--install`. Existing bundles are protected unless `--force` is passed. Work is staged before publication, with errors leaving existing content intact.

The viewer lives in `site/` and is the default example target. Framework integrations compile original source. Each component has a manifest with source files, dependencies, prop documentation and optional preview props. React/Solid JSX paths are separated. The preview is isolated in an iframe to avoid component CSS leaking into the viewer. A generated preview wrapper can be edited for required props, providers or named exports. Static imports, literal dynamic imports, CSS imports/URLs and asset imports are supported. Computed dynamic imports, runtime filesystem access and application-wide providers/configuration cannot be automatically transplanted and must produce clear limitations/errors.

Verification: Go CLI tests; Bun copier tests including nesting, collisions, cycles, aliases, missing deps and all four component syntaxes; production Astro build with four interactive examples; browser checks for navigation, source switching, props, responsive layout and preview interaction.
