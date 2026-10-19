# The Human Computer as a Hidden Flight System

An interactive epistemic map for *Human Computers: The Women in Aeronautical Research*. The site treats human computation as a linked technical, social, institutional, and archival system rather than a flat set of biographies.

## What the map contains

- Eight top-level domains derived from the study-guide ontology.
- More than 60 explorable concepts with claims, evidence, provenance, and cross-links.
- A dedicated eight-stage data-to-knowledge workflow.
- Search across people, instruments, institutions, and ideas.
- Responsive layouts for desktop and mobile, keyboard-accessible controls, and reduced-motion support.
- Document-level source notes that preserve the supplied study materials without presenting their orphaned reference numbers as formal citations.

## Run locally

No build step or dependencies are required. Serve the repository root with any static HTTP server. For example:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

## Structure

- `index.html` — semantic page structure
- `styles.css` — visual system and responsive behavior
- `data.js` — structured epistemic-map content
- `app.js` — graph rendering, search, details, and navigation
- `content/source-notes.md` — normalized notes for all eight supplied documents

## GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` publishes the repository root whenever `main` is updated. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions** once if it is not already selected.

The expected project URL is:

`https://rvfvn.github.io/women-in-aeronautical-research-epistemic-map/`
