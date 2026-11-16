# Contributing to Remotype

Thanks for helping. The most useful contributions are **compatibility reports** and **keyboard layouts**.

## Report that a console works (or does not)

Open an issue with the "Compatibility report" template and tell us the console type and version, the target OS, the layout selected in Remotype and what you typed. Every report helps fill [docs/compatibility.md](docs/compatibility.md).

## Run the checks

No build step and no dependencies. You need Node.js 18 or newer.

```
node test-keymap.mjs
```

It checks the layout tables, that no two characters share the same key combination, that both interface languages define the same strings, and that the manifest still has no host permissions or content scripts.

## Load the extension while developing

1. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and choose the repository folder.
2. After editing, click the reload icon on the extension card.

## Add a keyboard layout

Layouts live in `keymap.js` as rows of `[code, normal, shift, altgr]` where `code` is the physical key (`KeyboardEvent.code`). Remotype sends physical keys, so the layout you describe must be the layout **inside the remote machine**.

1. Add a row list and register it in `LAYOUTS` (set `experimental: true` until it has been confirmed on a real console).
2. Leave out dead keys.
3. Add checks in `test-keymap.mjs` for characters that differ from US, for example swapped letters and AltGr symbols.
4. Mention the layout in the READMEs.

## Add or fix a translation

Strings are in `i18n.js`. Both languages must define the same keys; the test enforces it.

## Pull requests

- Keep changes small and focused.
- Do not add host permissions, content scripts or network requests without a discussion first. The low-privilege design is a feature.
- Update the README and CHANGELOG when behaviour changes.
- Run `node test-keymap.mjs` before opening the PR.

## Code of conduct

Be respectful and constructive. Harassment is not tolerated.
