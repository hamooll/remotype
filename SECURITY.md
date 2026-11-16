# Security policy

Remotype uses Chrome's `debugger` permission, which is powerful, so security reports are taken seriously.

## What the extension can and cannot do

- It attaches the Chrome debugger to the **active tab only**. From the popup it is attached only while a typing job runs. In the side panel it stays attached from the first Type until you press Disconnect, close the panel, press Cancel on Chrome's debugging bar, or the idle timeout (15 minutes by default) expires. Chrome shows its debugging bar the whole time the debugger is attached, and the panel shows a "Connected" row.
- It requests the permissions `debugger`, `storage`, `sidePanel` and `alarms` (used only for the idle timeout). It has **no host permissions and no content scripts**.
- It makes **no network requests** and has no analytics.
- Text you type is held in memory for the job and is **not stored**. Only snippets you save explicitly are kept in `chrome.storage.local`.
- Settings and snippets are not synced.

Anything that contradicts the list above is a security bug.

## Reporting a vulnerability

Please do **not** open a public issue for a vulnerability. Use GitHub's private vulnerability reporting for this repository (Security tab, "Report a vulnerability"). Include the version, steps to reproduce and the impact.

You can expect an acknowledgement within a few days. This is a volunteer project, so there is no guaranteed fix time, but confirmed issues are prioritised.

## Supported versions

Only the latest release receives security fixes.

## Using it safely

- Read the source before using it with sensitive credentials. It is intentionally small.
- Do not save passwords as snippets.
- If your organisation disables console paste as a policy, confirm that typing text into the console is permitted.
- Install only from this repository or its official releases. A modified copy with the same permissions could do much more than this one.
