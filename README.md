# Greenville Custom Computers

Static website for **Greenville Custom Computers**, a custom PC building and computer repair shop in Greenville, SC.

Plain HTML, CSS, and JavaScript. No build step, no frameworks, no npm dependencies.

## Local preview

From the repository root:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

## GitHub Pages

In the repository settings, enable GitHub Pages from the `main` branch, serving from the root (`/`). The site is ready to publish as-is.

## Structure

```
index.html                 Homepage (hero → about → services → contact)
404.html
css/styles.css
js/main.js
fonts/outfit-latin-wght.woff2
assets/images/
favicon.svg
robots.txt
sitemap.xml
```
