# Neha Mishra: portfolio

A static portfolio site. Plain HTML, CSS and JavaScript (jQuery, GSAP, Bootstrap 5 grid). No build step.

## Run it

Open `index.html` in a browser, or serve the folder:

```
python -m http.server 8765
```

then visit http://localhost:8765/.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: About, Skills, Projects, Experience, Rewards, Contact |
| `freelance.html` | Services and pricing |
| `resume.html` | Print-ready resume (source of the PDF) |
| `404.html` | Not-found page (used by Netlify and GitHub Pages) |

## Where things live

- `js/partials.js`: the shared header and footer markup. Edit it once, it applies to every page.
- `js/app.js`: shared behaviour (theme, navigation, wave text).
- `js/home.js`: home page behaviour (hero, portrait, projects, experience).
- `js/interactive.js`: filters, command palette (Ctrl+K), progress bar, cursor, lightbox, etc.
- `js/footer-crowd.js`: the animated footer crowd.
- `css/overrides.css`: all of my own styles. `base.css`, `home.css`, `footer.css`, `freelance.css` are the original compiled styles.

## Common edits

- **Portrait:** replace `assets/img/neha.png` (transparent background works best; about 20:23 shape, 1200px wide or more). The card colour is set in `css/overrides.css` (`--portrait-bg-*`).
- **Projects:** each project is a folder button plus a matching `<article class="project-study study-<id>">` in `index.html`. The `<id>` must match the folder's `data-folder-id`. Filter groups and skill links are listed at the top of `js/interactive.js` (`GROUPS`, `STACKS`).
- **Resume PDF:** edit `resume.html`, then open it in Chrome and use Print > Save as PDF, saving over `assets/Neha-Mishra-Resume.pdf`. Keep it on one A4 page.
- **Skills:** the lists in the `#skills` section of `index.html`.

## Deploy

It is a static folder, so Netlify (drag the folder in) or GitHub Pages work as they are.
