# Competitor notes

Research done 2026-11-16 from public listings and forum threads. Chrome Web Store pages could not be opened directly (consent redirect / store blocks embedded browsers), so store data comes from mirror sites (chromeboard.com, extscope.org) and search snippets. Counts and ratings change; treat them as a snapshot. Claims below are the listings' own claims unless marked otherwise.

## Existing extensions

| Extension | Targets | What the listing says | Source |
|---|---|---|---|
| Paste to vSphere VM (v1.2.0, 1K+ users, updated 2024-08-19) | vSphere HTML console | Types clipboard via simulated keystrokes with Ctrl+Shift+V (Cmd+Shift+V on Mac); clears clipboard after the first paste; advises reloading the console tab and not clicking the console; fork of "Paste To VM" with jQuery removed and Manifest V3 | [chromeboard](https://chromeboard.com/extension/paste-to-vsphere-vm-hadnleonijfgnmidiioafibhhikhacfe) |
| KVM Console Paste (v1.0.3, 737 users, updated 2026-04-11) | noVNC: IONOS, Proxmox VE, Plesk and others | Blocked by default, enable per domain; detects consoles inside iframes; typing speed 10 to 200 ms per character; configurable delay after Enter; progress indicator with cancel; right-click paste; says it collects no data | [chromeboard](https://chromeboard.com/extension/kvm-console-paste-acogolacfpbgbddopekjchlckaggmjkd) |
| PVE Snippets (v1.6.0, about 1K users, 4.7 from 7 reviews) | Proxmox noVNC and any focused field | Floating paste button, Ctrl+V, popup send, up to 200 saved snippets, optional Gist backup, layouts US/UK/DE/FR/ES/IT/PT/NL/CA/AU-NZ/IE with dead keys. Permissions per the mirror's static analysis: clipboardRead, storage, tabs, all URLs (rated high risk there) | [extscope](https://extscope.org/zh/extension/jampbpobgkkfoeiogobjlbhldkjgcfkg), [chromeboard](https://chromeboard.com/extension/pve-snippets-jampbpobgkkfoeiogobjlbhldkjgcfkg) |
| sageproxpaste (GitHub, open source) | Proxmox | Popup text box; injects a keystroke simulator into frames and fires keydown/keypress/keyup per character; handles Shift and symbols; README does not describe layout handling | [GitHub](https://github.com/Sage222/sageproxpaste) |
| Typing Simulator, PasteCat, noVNC Paste-typer (userscript) | general typing / Proxmox | Seen only in search results: [Typing Simulator](https://chromewebstore.google.com/detail/typing-simulator/ehogphbgebbonllcnpaddamhlnpbkman) (store listing), PasteCat (described as typing like a human on Proxmox VNC), and the [noVNC Paste-typer for Proxmox](https://greasyfork.org/en/scripts/498881-novnc-paste-typer-for-proxmox) userscript that sends pasted text as keystrokes. Not reviewed in detail | search results |
| VM Console Extension (Chrome) | Proxmox | Paste into Proxmox console; mirrors show about 3.3 to 3.6 stars; no layout feature confirmed | [chromeboard](https://www.chromeboard.com/extension/vm-console-extension-mnkdipbaleabnmdhikbhnkennhldlmaf) |
| VM Console Clipboard, PasteIt (Firefox) | vSphere, ESXi, Proxmox | Only seen through search snippets (pages did not load): floating panel, no VMware Tools needed; PasteIt emulates real keyboard events | [AMO](https://addons.mozilla.org/firefox/addon/vm-console-clipboard/), [AMO](https://addons.mozilla.org/es-ES/firefox/addon/pasteit/) |

## Documented user problems

- **Keyboard layouts are the most reported failure.** PVE Snippets reviews mention garbled output on an AZERTY keyboard and mixed-up text on German layouts (via [extscope](https://extscope.org/zh/extension/jampbpobgkkfoeiogobjlbhldkjgcfkg)). A Proxmox forum reply explains that text and keystrokes are different things, and that browsers do not all expose layout information ([Proxmox forum](https://forum.proxmox.com/threads/novnc-copy-paste-not-works.19773/latest)).
- **Native clipboard needs guest software.** In Proxmox the VNC clipboard needs a guest agent such as spice-agent ([Proxmox forum](https://forum.proxmox.com/goto/post?id=368569)).
- **vSphere web console vs. VMRC.** Forum replies say copy/paste works in the full VM Remote Console but not in the web console even after changing `isolation.tools.copy.disable` and `isolation.tools.paste.disable`, and that changes apply after a VM restart ([Broadcom community](https://community.broadcom.com/vmware-cloud-foundation/discussion/cut-and-paste-is-not-working-in-the-web-console)).
- **Blocked on purpose.** Security benchmarks tell admins to disable console paste ([Tenable CIS audit item](https://www.tenable.com/audits/items/CIS_VMware_ESXi_8.0_v1.2.0_L1_VMware.audit:23e3e61071582f26ef067acb38e50400)). A typing tool may bypass a control the organisation set deliberately.
- **Fragile DIY workarounds.** Users resort to AutoHotkey, Tampermonkey scripts or pasted snippets that can break with browser updates ([Proxmox forum](https://forum.proxmox.com/threads/novnc-copy-paste-not-works.19773/latest)).

## What matters to this class of user (derived from the above)

1. Correct characters on non-US layouts, including AltGr and a clear way to pick the target layout.
2. Speed control, a pause after Enter, and a way to cancel mid-way.
3. Works inside iframes and different consoles without per-site setup.
4. Low privilege: several competitors request broad site access; users notice this.
5. Saved snippets for repeated commands.
6. Clear privacy statement: no network, no analytics.

## How Remotype compares (verified against this repo)

- Layouts: US, UK, DE, FR with AltGr (UK, DE, FR experimental and untested on real consoles). Dead keys are not supported, unlike PVE Snippets, which lists dead-key composition.
- Permissions: `debugger` and `storage` only. No host permissions, no content scripts, no clipboard permission, so it acts only on the tab you use it on.
- Delay between keys, pause after Enter, start delay, progress badge, stop button, saved snippets, EN/FA interface.
- Missing compared with competitors: floating on-page button, Ctrl+V/hotkey paste from clipboard, right-click paste, snippet backup/sync, more than four layouts.
- Trade-off: the debugger approach shows Chrome's "started debugging" bar while typing. Whether trusted debugger events work better than synthetic events on every console is not yet verified; competitors' exact event method is not documented in the sources above.
