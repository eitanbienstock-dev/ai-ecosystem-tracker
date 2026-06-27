# Patch 0020 — AI Infrastructure Stack page

## Files to copy into your project

1. `public/ai-infrastructure-stack.html`  →  drop into `public/`
2. `app/infrastructure/page.tsx`           →  create new folder `app/infrastructure/` and drop in

## One manual edit required — layout.tsx nav

In `app/layout.tsx`, find this line (the Coverage map nav link):

```
href="/dashboard">Coverage map</a>
```

Add the following link **immediately after** it (before the "+ Add company" link):

```tsx
<Link
  className="rounded border border-line bg-panelhi px-3 py-1.5 text-sm font-medium text-[#e7e8ea] hover:border-signal hover:text-signal"
  href="/infrastructure"
>
  AI stack
</Link>
```

If your nav uses `<a>` tags instead of `<Link>`, use the same class string but with `<a href="/infrastructure">AI stack</a>`.

## What this does

Adds a new route at `/infrastructure` that serves the interactive AI Infrastructure Stack
diagram you built — all interactivity (node clicks, flow traces, animated dot) works exactly
as in the standalone file. The diagram is served from `public/` and embedded via iframe so
no JS conversion was needed.
