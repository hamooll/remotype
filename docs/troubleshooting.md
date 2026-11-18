# Troubleshooting

[فارسی](troubleshooting.fa.md) · [Usage guide](usage.md) · [Back to README](../README.md)

## Nothing is typed

- **Click inside the console first** so it has keyboard focus, then open Remotype and press Type.
- **DevTools is open on the tab.** The debugger cannot attach while DevTools is open on the same tab. Close it and try again.
- **Internal pages.** Chrome does not allow extensions on pages such as `chrome://` or the Web Store.
- **Another extension is debugging the tab.** Some tools use the debugger too. Remotype can usually share the tab, but if it reports an error, disable the other tool for the test.

## Some characters are wrong or missing

- **Layout mismatch.** The layout selected in Remotype must match the layout configured **inside the remote machine**. In the vSphere web console, press **Enforce US Keyboard Layout** and choose US in Remotype.
- **Caps Lock is on** in the remote machine; letters will have the wrong case.
- **Keys are dropped.** Increase "Delay between keys" (for example from 15 to 40 ms) and "Pause after Enter".
- **Characters not on the layout** are listed in a yellow warning and skipped. Non-Latin text (Persian, Arabic and others) cannot be typed.
- **Dead keys** (`^`, `´`, `¨`) are not supported on German and French layouts.
- **AltGr characters** on UK, German and French layouts are experimental. If `@`, `|`, `\\` or `{ }` come out wrong, please open a compatibility report.

## The side panel does not open

- It needs Chrome 116 or newer.
- Use the **Side panel** button in the popup or the shortcut `Alt+Shift+L`. Check `chrome://extensions/shortcuts` for conflicts.

## Chrome shows "started debugging this browser"

That is Chrome's notice whenever an extension uses the debugger. With the popup it is shown only while Remotype is typing. With the side panel it stays while the session is connected (the panel shows a green "Connected" row); press **Disconnect**, close the panel, or wait for the idle timeout to end it. Clicking Cancel on Chrome's bar also disconnects and stops any typing.

If you want the bar to go away after every command, turn off "Stay connected while this panel is open" in the panel settings. While connected, DevTools cannot be opened on the same tab.

## Typing went to the wrong tab

The side panel types into the tab that is **active when you press Type**. Switch to the console tab first.

If the console opened in its own popup window, open Remotype from your main window and choose that popup in the **Type into** list. See [Console in its own popup window](usage.md#console-in-its-own-popup-window).

## Paste is disabled on purpose in my company

Remotype types text key by key, like a person would. If console paste is disabled by policy, make sure using Remotype is allowed in your environment.

## Still stuck

Open an issue with the console type, guest OS, layout selected, Chrome version and what you saw. Leave out real hostnames and credentials.
