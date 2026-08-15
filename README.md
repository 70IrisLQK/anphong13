# An Phong 13

**An Phong 13** is a short, mobile-friendly horror tracing game for the web. Players have 12 seconds to trace each supernatural sigil as accurately as possible and seal five entities before the night shift ends.

## Play

- GitHub Pages: https://70irislqk.github.io/anphong13/
- Backup demo: https://ca-dem-13.khanh-forget5.chatgpt.site
- Input: mouse, trackpad, stylus, or touch
- Session length: about 60–90 seconds
- No login, installation, advertising, or in-app purchases
- The game stores only the device-local high score and does not collect personal data

## Gameplay

1. Start at the glowing point.
2. Trace the complete sigil with one continuous stroke.
3. Accuracy, path coverage, and remaining time determine the score.
4. Reach at least 78% accuracy to preserve the sealing combo.
5. Complete five sigils and replay to beat the local high score.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

## Validation

```bash
npm test
npm run lint
npm run build:pages
```

The deployable GitHub Pages build is committed in `docs/`. In repository settings, select **Deploy from a branch**, branch `main`, folder `/docs`.
