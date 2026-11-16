# RainyMurphy

**English** | [简体中文](README.zh-CN.md)

A browser toolkit for the **Rainy75 V2 IPS screen**: flash screen firmware, manage animation slots, read device information, and control RGB lighting.

Made by **JimmyRespawn**.

The web app and firmware are separate. **The public source tree contains no bundled, encoded, or hidden firmware BIN.** Choose your own firmware on the **Flash firmware** tab, or select an entry from the theme catalog. Local files stay in the current page session, are not uploaded, and are cleared when you reload.

## Features

- One shared connection for device information, lighting, and animation management. A single previously authorized device can reconnect without another picker.
- USB supports all tools; the 2.4 GHz receiver supports battery readings and RGB control.
- Four wallpaper slots, with confirmation before deletion and readback to verify the result.
- Screen BIN size, application address, and vector checks; SHA-256 verification for catalog themes.
- Automatic connection handover for flashing. Previously authorized BOOT devices are detected automatically; initial authorization may still require a click. After successful flashing, the app attempts to reconnect in normal USB mode.
- Chinese and English, selected automatically from the browser’s preferred language, with a saved manual override.
- Light, dark, and system appearance modes.
- A rough theoretical battery-runtime estimate, paused while RGB is enabled. This is not a measured runtime claim.

**Choose the flash target explicitly: IPS screen or 2.4 GHz receiver.** Screen applications start at `0x08004000`; the legacy receiver application uses Flash offset `0x2000`, normal PID `0x3071`, and BOOT PID `0x3070`. Keyboard controller firmware and full Flash backups are not supported. Structural validation does not establish hardware compatibility. Confirm the target hardware and accept the risks before flashing external firmware.

## For users

Use desktop **Chrome or Edge** with WebHID support.

### Hosted website

Open the maintainer’s HTTPS website. No Node.js installation, scripts, or local server are required. Browse published themes or choose your own local BIN on the **Flash firmware** tab. Selecting firmware does not start flashing; review it and click **Start flashing** yourself.

### Offline ZIP

Fully extract the offline release and open **`RainyMurphy.html`** in Chrome or Edge. No installation or server is needed.

The HTML contains the interface, theme catalog, PNG covers, and GIF previews. Firmware remains in separate BIN files. When you select a theme, the browser asks you to choose its corresponding BIN from the extracted folder; the app then checks its size, SHA-256, and application structure. This file-selection step is required by local-file access restrictions. You can also choose another BIN on the **Flash firmware** tab.

The browser may request device access on first connection and again when the device switches to BOOT mode. Keep USB connected and the device powered throughout flashing.

## Development

Requires **Node.js 20+**. There are no third-party npm dependencies.

```sh
npm run dev
```

Open `http://127.0.0.1:4173` in desktop Chrome or Edge. On Windows, `Start-RainyMurphy.cmd` starts the development server and opens the browser. These development tools are for maintainers, not end users.

Opening `src/index.html` directly does not provide access to catalog JSON or BIN files. Use the development server, or generate the self-contained offline release described below.

```sh
npm test
npm run check
npm run build
```

The public website is written to `dist/`. Deploy its contents to GitHub Pages or another HTTPS static host. Relative URLs support project paths such as `username.github.io/RainyMurphy/`.

## Offline packaging

```sh
npm run pack:offline
```

Creates `release/RainyMurphy-offline.zip`. Send that ZIP to users; they extract it and open the HTML. Changes to the catalog or previews require rebuilding the package. If an existing ZIP is locked, the script creates a new file with a timestamp suffix.

## Firmware catalogs and private themes

The public official and community catalogs start empty. Firmware catalog submissions can be proposed through pull requests. Build checks validate metadata, paths, file sizes, SHA-256, image structure, and **320 × 172** previews. Each entry requires a PNG cover and may include a GIF animation. Selecting a theme verifies the file and requires risk confirmation; it never starts flashing automatically.

The **official** folder is a catalog category, not a claim that this project is endorsed by the manufacturer.

Local development also reads private catalogs from `firmware/bongocat/` and `firmware/local/`, when present. Those folders are ignored by Git and excluded from public builds and packages.

```sh
# Build and preview private local themes
npm run build:local
npm run preview

# Package private local themes for local testing
npm run pack:offline:local
```

The local ZIP is written to `release/RainyMurphy-offline-local.zip`. Private entries are accepted on localhost and in explicitly generated local offline packages. CI rejects builds and packages that include local themes.

**Do not publish private test artifacts.** `dist/`, `release/`, and the private firmware folders are ignored by Git, but manual uploads can still disclose their contents. Public deployment should use `npm run build`; public offline distribution should use `npm run pack:offline`.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/` | HTML, CSS, plain JavaScript, and custom SVG assets |
| `src/js/device/` | Shared connection and screen protocol |
| `src/js/firmware/` | BIN validation, selection, and IPS flashing transport |
| `src/js/ui/` | Tabs, device info, animation management, themes, appearance, and translations |
| `doc/` | Usage, development, deployment, and protocol documentation (Chinese) |
| `firmware/official/` | Public official-firmware catalog, initially empty |
| `marketplace/` | Community catalog, schema, and submission example |
| `scripts/` | Development server, validation, website builds, and offline packaging |
| `test/` | Automated checks that do not require hardware |

## Further documentation

The following guides are currently in Chinese:

- [Usage](doc/usage.md)
- [GitHub Pages deployment](doc/deployment.md)
- [Architecture and development](doc/development.md)
- [Protocol and limitations](doc/protocol.md)
- [Official firmware catalog](firmware/official/README.md)
- [Community firmware submissions](marketplace/README.md)
- [Contributing](CONTRIBUTING.md)

## License and status

The web app source is licensed under [MIT](LICENSE). Firmware retains its own licensing terms; the source-code license does not grant rights to vendor firmware. The project does not include official driver scripts, vendor fonts, or the official keyboard render. The interface uses a custom keyboard-layout illustration.

This is a community tool and is not affiliated with or endorsed by WOB. Offline simulation does not replace hardware testing. Maintainers should record supported hardware and actual test results.

## Receiver flashing

Choose **2.4 GHz receiver** on the Flash firmware tab, select a raw receiver BIN, review its SHA-256 and target, and accept the receiver-specific risk statement. The file stays local. Screen themes remain screen-only; selections for the two targets are independent.

The receiver transport follows the legacy tool’s boot command, erase, write and verify sequence. The receiver validator checks its RISC-V entry and known RAM vector layout; it does not use the screen’s ARM vector rules. A conservative **56 KiB tool limit** applies; it is not a statement of physical Flash capacity. Different image layouts are rejected. The version is not inferred from a filename and is not fixed to 0x26 or 0x27.

After a receiver flash, the shared device connection is released; reconnect explicitly to read device information. No receiver firmware is bundled. Automated tests and file checks are not hardware validation; this integration has not been flashed on real hardware here.
