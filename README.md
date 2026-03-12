# ADU Consultant — iPhone PWA

An AI-powered ADU feasibility tool that installs on your iPhone home screen like a native app.

---

## Install on iPhone (30 seconds)

The app must be hosted online for iPhone installation. Easiest option: **GitHub Pages (free)**.

### Step 1 — Host on GitHub Pages

1. Go to [github.com](https://github.com) and create a free account (if you don't have one)
2. Click **New repository** → name it `adu-consultant` → set to **Public** → Create
3. Click **uploading an existing file** → drag all files from this folder into the upload area
4. Click **Commit changes**
5. Go to **Settings** → **Pages** → Source: **Deploy from branch** → Branch: **main** → Save
6. Wait ~60 seconds → your URL is: `https://YOUR-USERNAME.github.io/adu-consultant`

### Step 2 — Add to iPhone Home Screen

1. Open the URL above in **Safari** on your iPhone (must be Safari, not Chrome)
2. Tap the **Share button** (square with arrow pointing up, at bottom of screen)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **Add**
5. The ADU icon appears on your home screen — tap it to open fullscreen like a native app

### Step 3 — Enter your API key

1. Open the app → tap **Settings** tab
2. Enter your Anthropic API key (`sk-ant-...`) → tap Save Key
3. Start running analyses

---

## Getting an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / log in → API Keys → Create Key
3. Cost: ~$0.002–0.004 per analysis (essentially free)

---

## File Structure

```
adu-consultant/
├── index.html       ← Main app
├── manifest.json    ← PWA config (makes it installable)
├── sw.js            ← Service worker (offline support)
├── css/style.css    ← All styles
├── js/app.js        ← All logic
├── icons/           ← App icons
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
└── README.md
```

---

## Features

- Native iPhone feel — fullscreen, no browser bar
- Bottom tab bar navigation (Analyze / History / Settings)
- Report slides up as a bottom sheet
- All past analyses saved on device
- Works offline (form available, analysis requires internet)
- Print/PDF any report with one tap
