# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.2.0]

### Added
- Connected session in the side panel: the debugger stays attached between commands (no page jump on every command), with a "Connected" indicator, a Disconnect button and an "ON" badge on the toolbar icon.
- Automatic disconnect when the panel is closed, after an idle time (15 minutes by default, configurable) or when you press Cancel on Chrome's bar. The popup still attaches per job.
- Setting "Stay connected while this panel is open" to switch the session behaviour off.
- Automated tests for the attach / detach / session logic against a mocked Chrome API (`node test-background.mjs`).

### Changed
- New permission: `alarms` (only for the idle timeout).

## [1.1.0]

### Added
- Side panel that stays open while you click around the console, with live progress and a Stop button (`Alt+Shift+L`).
- Keyboard layout picker: US, UK, German, French (UK, German and French are experimental), including Shift and AltGr handling.
- English and Persian interface with a language toggle.
- Saved snippets with one-click typing.
- Bilingual README, security policy, contribution guide and compatibility notes.

### Changed
- Renamed to **Remotype**.
- Minimum Chrome version is 116 (required for the side panel API).

## [1.0.0]

- First working version: popup that types text into the active tab key by key using Chrome's debugger API, with US layout, adjustable delays and a Stop control.
