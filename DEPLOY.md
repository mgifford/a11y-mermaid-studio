# Pushing to GitHub

The project is ready to push to GitHub Pages. Follow these steps:

## Step 1: Create Repository on GitHub

Go to: https://github.com/new

Fill in:
- **Repository name:** `a11y-mermaid-studio`
- **Description:** Transform Mermaid diagrams into WCAG 2.2 AA-compliant, accessible SVGs
- **Visibility:** Public
- **Initialize with:** (leave unchecked - we have our own files)

Click **Create repository**

## Step 2: Add Remote and Push

After creating the repository, GitHub will show you instructions. Run these commands:

```bash
cd /Users/mgifford/a11y-mermaid-studio

git remote add origin https://github.com/mgifford/a11y-mermaid-studio.git
git branch -M main
git push -u origin main
```

Replace `mgifford` with your GitHub username if different.

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Scroll to **Pages** (left sidebar)
4. Under "Source":
   - Branch: **main**
   - Folder: **/ (root)**
5. Click **Save**

GitHub will show the site URL. It may take 1-2 minutes to deploy.

## Step 4: Verify Deployment

Site will be live at: `https://mgifford.github.io/a11y-mermaid-studio/`

Test:
- Can you load the page?
- Can you render a diagram?
- Can you export SVG?
- Light/dark mode toggle working?

## Local Development

You can continue developing locally while the site is live:

```bash
python3 -m http.server 8008
# Open http://localhost:8008
```

Push changes anytime with:
```bash
git add -A
git commit -m "Your message"
git push origin main
```

---

**Ready?** Create the GitHub repo and run the commands above! 🚀
