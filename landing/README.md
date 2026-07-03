# Claude Code Pet — Landing Page

The marketing site for [Claude Code Pet](https://github.com/ahfoysal/claude-code-pet). Built with **Next.js 14**, **Tailwind CSS**, and **Framer Motion**. Animated with the real pet sprites.

## Deploy to Vercel (one click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ahfoysal/claude-code-pet&root-directory=landing&project-name=claude-code-pet&repository-name=claude-code-pet)

> **Important:** in the Vercel import screen, set **Root Directory** to `landing`. Vercel auto-detects Next.js — no other config needed.

## Local development

```bash
cd landing
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Structure

```
app/page.tsx         # the whole page (hero, states, roster, features, install, CTA)
components/PetSprite.tsx  # cycles the real pet SVG frames
public/pets/<id>/    # sprite frames for all 9 pets
public/demo.gif      # the pet demo
```

To refresh sprites after editing the pet art, re-copy from the app:

```bash
for id in clawd quacks embyr owlbert boulder sprout stax oops voidling; do
  cp ../src/themes/$id/*.svg public/pets/$id/
done
```

MIT © ahfoysal
