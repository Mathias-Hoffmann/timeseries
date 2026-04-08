# GitHub Pages Configuration

This repository is configured to use GitHub Pages with the `gh-pages` branch as the source.

The deployment is automated via GitHub Actions:
- On every push to `main`, the workflow builds the project with Vite
- The built files are pushed to the `gh-pages` branch
- GitHub Pages serves the content from `gh-pages`

## Access the site
https://mathias-hoffmann.github.io/timeseries/

## Manual deployment
If needed, you can manually build and deploy:
```bash
npm run build
git checkout --orphan gh-pages
git rm -rf .
cp -r dist/* .
git add .
git commit -m "Deploy"
git push -u origin gh-pages --force
git checkout main
```
