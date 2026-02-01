# Obsidian Game Giveaways Plugin

This plugin for Obsidian fetches the latest game giveaways from various platforms and organizes them into neat, easy-to-read notes.

## Features

- **Automatic Updates:** Keep your giveaway list fresh with automatic updates.
- **Customizable Categories:** Giveaways are sorted into categories like Epic Games, Steam, PlayStation, Xbox, and more.
- **Detailed Information:** Each giveaway entry includes the title, value, description, and instructions on how to claim it.
- **Flexible Scheduling:** Choose between daily updates or a special weekly schedule that syncs with the Epic Games Store.

## How to Use

1. **Install the plugin:**
   - Go to the releases page of this repository.
   - Download the latest release, which contains `main.js` and `manifest.json`.
   - In your Obsidian vault, go to `.obsidian/plugins/`.
   - Create a new folder named `obsidian-game-giveaways`.
   - Copy the downloaded `main.js` and `manifest.json` files into this new folder.
   - Restart Obsidian and enable the plugin in the settings.
2. **Configure the settings:**
   - Open the plugin settings in Obsidian.
   - **Folder Name:** Choose where you want the giveaway notes to be saved.
   - **Auto Update:** Enable this to have the plugin fetch giveaways automatically.
   - **Update Schedule:**
     - **Epic Games Weekly Schedule:** If you want to sync with the Epic Games Store's weekly giveaways, enable this option.
     - **Custom Interval:** If you prefer a different update frequency, you can set an interval in hours.
3. **Fetch giveaways:**
   - The plugin will fetch giveaways automatically based on your settings.
   - You can also manually trigger an update by running the "Refresh Game Giveaways By Platform" command from the command palette.

## Screenshots

(You can add screenshots here to show the plugin in action.)

## For Developers

This plugin is built with TypeScript and Rollup.

- `main.ts`: The main entry point of the plugin.
- `manifest.json`: The plugin manifest.
- `package.json`: The project dependencies.

### Build

To build the plugin, you'll need to have Node.js and npm installed.

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Run `npm run build` to build the plugin.

This will create a `main.js` file in the project root, which you can then use to test the plugin in Obsidian.

### Development

To develop the plugin, you'll need to have Node.js and npm installed.

1. Clone the repository.
2. Run `npm install` to install the dependencies.
3. Run `npm run dev` to generate the plugin.

If you get permissions error:
```
sh: line 1: /home/retro/packages/Obsidian-Game-Giveaways/node_modules/.bin/rollup: Permission denied
```
Add permission, then try again:
```
chmod +x node_modules/.bin/rollup
```
- You should have `main.ts` and `manifest.json` generated now.
- In your Obsidian vault, go to `.obsidian/plugins/` and create a new folder named `obsidian-game-giveaways`.
- Copy `main.ts` and `manifest.json` there.
- Restart Obsidian Vault, should find the plugin now.