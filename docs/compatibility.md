# Compatibility

Remotype sends standard keyboard events, so it should work with any console that accepts keyboard input in a focused page. "Should work" is not "confirmed". This page lists only what has actually been tried. Please send reports using the "Compatibility report" issue template.

Status meanings: **Confirmed** = someone typed text successfully and reported it. **Untested** = no report yet.

## Consoles

| Console | Status | Notes |
|---|---|---|
| VMware vSphere / vCenter web console (HTML5) | **Confirmed** | Reported by the author: vCenter web console, Windows guest, US layout, text typed into the Windows search box. Chrome version was not recorded |
| VMware ESXi host web console | Untested | |
| Proxmox VE (noVNC) | Untested | |
| noVNC standalone | Untested | |
| IONOS / Plesk noVNC consoles | Untested | |
| Other canvas-based remote consoles | Untested | |

## Keyboard layouts

| Layout | Status | Notes |
|---|---|---|
| US | **Confirmed** (see vSphere above) | In the vSphere web console, use "Enforce US Keyboard Layout" if the guest layout differs |
| UK | Untested | Experimental |
| German | Untested | Experimental. Dead keys `^` and `´` not supported |
| French | Untested | Experimental. Dead keys `^` and `¨` not supported |

## Browsers

| Browser | Status |
|---|---|
| Google Chrome 116+ | Works for the confirmed case above |
| Microsoft Edge, Brave and other Chromium browsers | Untested |
| Firefox, Safari | Not supported (Chrome debugger API) |

## How to help

Include in your report: console type and version, guest OS, keyboard layout selected in Remotype, keyboard layout of the guest, Chrome version, whether the text came out correctly, and any characters that were wrong. Do not include real hostnames, IP addresses or credentials in screenshots.
