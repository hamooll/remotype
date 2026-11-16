# Usage guide

[فارسی](usage.fa.md) · [Back to README](../README.md) · [Troubleshooting](troubleshooting.md)

## Quick start

1. Open the console tab and **click inside the console** so it has keyboard focus.
2. Open Remotype (toolbar icon, or `Alt+Shift+K`).
3. Paste your text, check the **layout** (it must match the layout configured inside the remote machine).
4. Press **Type** (or `Ctrl+Enter`).

Remotype sends the text as real key presses to the active tab. Newlines become Enter, tabs become Tab.

## Popup or side panel?

| | Popup | Side panel |
|---|---|---|
| Open with | Toolbar icon, `Alt+Shift+K` | "Side panel" button in the popup, `Alt+Shift+L` |
| Stays open when you click the console | No (Chrome closes popups) | **Yes** |
| Debugger attachment | Per typing job | Stays connected until you disconnect (see below) |
| Stop button while typing | Rarely usable (popup closes) | Yes |
| Best for | A single quick paste | Running many commands in a row |

Typing always goes to the tab that is **active when you press Type**. With the side panel open, switch to the console tab first.

## Keyboard layout

Remotype sends physical keys, so the layout you select must be the layout **inside the remote machine**.

- **US (QWERTY)** is the default and the only layout confirmed on a real console so far.
- UK, German and French are experimental. Dead keys (`^`, `´`, `¨`) are not supported.
- In the vSphere web console, press **Enforce US Keyboard Layout** and keep Remotype on US.
- Characters that do not exist on the selected layout (for example Persian letters) are listed in a yellow warning and skipped.

## Snippets (saved commands)

- Click a snippet name to load it into the text box.
- Click **▶** next to it to type it immediately.
- Write a name, then press **Save text above** to store the current text. Press **×** to delete one.
- Four example snippets are included; edit or delete them freely.
- Snippets are stored in this browser profile only and are never synced. **Do not save passwords as snippets.**

The text box itself is not stored. If you close the popup, the text is gone.

## Side panel session

In the side panel, the first **Type** connects Chrome's debugger to the tab and keeps it connected, so running several commands does not make the page jump each time.

- A green **Connected** row shows when the session is active, and the toolbar icon shows **ON**.
- Press **Disconnect** to end it. It also ends when you close the panel, press Cancel on Chrome's "started debugging this browser" bar, or leave it idle for the configured time (15 minutes by default).
- While connected, DevTools cannot be opened on the same tab.
- To make the panel behave like the popup (attach per command), turn off **Stay connected while this panel is open** in Settings.

## Settings

| Setting | Default | What it does |
|---|---|---|
| Keyboard layout | US | Layout of the target machine |
| Delay between keys | 15 ms | Raise it if keys are dropped |
| Pause after Enter | 80 ms | Time to wait after each new line, useful for slow shells |
| Start after | 1 s | Countdown before typing starts (shown on the toolbar icon) |
| Press Enter at the end | off | Adds one Enter after your text |
| Stay connected while this panel is open | on | Side panel only |
| Disconnect after idle | 15 min | Side panel only |

Settings and the interface language (English / Persian toggle at the top) are remembered.

## Stopping

Press **Stop** in the side panel. You can also click Cancel on Chrome's debugging bar, which disconnects and stops typing. The toolbar icon shows `✓` when a job finishes and `!` when it fails or is stopped.

## Tips

- **Long scripts:** raise "Delay between keys" (for example to 30 to 50 ms) and "Pause after Enter" if lines are lost.
- **One long line vs many lines:** each newline is sent as Enter, so a multi-line script runs line by line in the remote shell.
- **Passwords:** Remotype types whatever you give it and does not store it. Review the text before pressing Type, and avoid pasting secrets you do not need to type.
- **Wrong characters:** nearly always a layout mismatch. See [Troubleshooting](troubleshooting.md).
- **Shortcuts** can be changed at `chrome://extensions/shortcuts`.

## Consoles

Only the VMware vCenter web console has been confirmed so far. See [Compatibility](compatibility.md) and please report other consoles.
