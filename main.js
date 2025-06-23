'use strict';

var obsidian = require('obsidian');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const DEFAULT_SETTINGS = {
    folderName: "Game Giveaways",
    autoUpdate: false,
    updateIntervalHours: 24,
    epicScheduled: false,
    dailyUpdateEnabled: false,
    dailyUpdateInterval: 6,
};
class GiveawayByPlatformPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.intervalHandle = null;
        this.timeoutHandle = null;
        this.dailyHandle = null;
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings();
            this.addCommand({
                id: "refresh-giveaways-by-platform",
                name: "Refresh Game Giveaways By Platform",
                callback: () => this.fetchAndCreateNotes(),
            });
            this.addSettingTab(new GiveawaySettingTab(this.app, this));
            if (this.settings.autoUpdate) {
                this.scheduleAutoUpdate();
            }
            if (this.settings.dailyUpdateEnabled) {
                this.scheduleDailyUpdate();
            }
            this.fetchAndCreateNotes();
        });
    }
    onunload() {
        if (this.intervalHandle !== null)
            clearInterval(this.intervalHandle);
        if (this.timeoutHandle !== null)
            clearTimeout(this.timeoutHandle);
        if (this.dailyHandle !== null)
            clearInterval(this.dailyHandle);
    }
    scheduleAutoUpdate() {
        if (this.settings.epicScheduled) {
            const now = new Date();
            const thursday = new Date(now);
            thursday.setDate(now.getDate() + ((4 + 7 - now.getDay()) % 7));
            thursday.setHours(18, 4, 0, 0);
            if (thursday <= now)
                thursday.setDate(thursday.getDate() + 7);
            const msUntil = thursday.getTime() - now.getTime();
            this.timeoutHandle = window.setTimeout(() => {
                this.fetchAndCreateNotes();
                this.intervalHandle = window.setInterval(() => this.fetchAndCreateNotes(), 7 * 24 * 60 * 60 * 1000);
            }, msUntil);
        }
        else {
            const ms = this.settings.updateIntervalHours * 60 * 60 * 1000;
            this.intervalHandle = window.setInterval(() => this.fetchAndCreateNotes(), ms);
        }
    }
    scheduleDailyUpdate() {
        const ms = this.settings.dailyUpdateInterval * 60 * 60 * 1000;
        this.dailyHandle = window.setInterval(() => this.fetchAndCreateNotes(), ms);
    }
    fetchGiveaways() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const responseText = yield obsidian.request({
                    url: "https://www.gamerpower.com/api/giveaways",
                    method: "GET",
                });
                const data = JSON.parse(responseText);
                if (!Array.isArray(data))
                    throw new Error("Unexpected API response format");
                return data.filter((g) => !g.platforms.includes("DRM-Free"));
            }
            catch (error) {
                throw new Error(`Failed to fetch giveaways: ${error}`);
            }
        });
    }
    groupByCustomCategories(giveaways) {
        var _a;
        const groups = {
            "Epic Games": [],
            "Steam": [],
            "PlayStation 5": [],
            "Xbox": [],
            "PC": [],
            "Mobile": [],
            "DLCs": [],
            "Other": []
        };
        for (const g of giveaways) {
            const platforms = g.platforms.split(",").map((p) => p.trim());
            if (((_a = g.type) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "dlc") {
                groups["DLCs"].push(g);
                continue;
            }
            let categorized = false;
            if (platforms.some(p => p.toLowerCase() === "epic games store")) {
                groups["Epic Games"].push(g);
                categorized = true;
            }
            if (platforms.some(p => p.toLowerCase() === "steam")) {
                groups["Steam"].push(g);
                categorized = true;
            }
            if (platforms.some(p => p.toLowerCase() === "playstation 5")) {
                groups["PlayStation 5"].push(g);
                categorized = true;
            }
            if (platforms.some(p => p.toLowerCase().includes("xbox"))) {
                groups["Xbox"].push(g);
                categorized = true;
            }
            if (platforms.some(p => p.toLowerCase() === "pc")) {
                groups["PC"].push(g);
                categorized = true;
            }
            if (platforms.some(p => p.toLowerCase() === "android" || p.toLowerCase() === "ios")) {
                groups["Mobile"].push(g);
                categorized = true;
            }
            if (!categorized) {
                groups["Other"].push(g);
            }
        }
        return groups;
    }
    formatGiveawayMarkdown(giveaways, category) {
        let md = `# ${category} Giveaways (${giveaways.length})\n\n`;
        for (const g of giveaways) {
            md += `## [${g.title}](${g.open_giveaway_url})\n`;
            if (g.thumbnail)
                md += `![Thumbnail](${g.thumbnail})\n\n`;
            md += `- **Worth**: ${g.worth}\n`;
            if (g.published_date)
                md += `- **Published**: ${g.published_date}\n`;
            if (g.end_date)
                md += `- **Ends**: ${g.end_date}\n`;
            if (g.users !== undefined)
                md += `- **Users Claimed**: ${g.users}\n`;
            md += `\n### Description\n${g.description}\n\n### Instructions\n${g.instructions}\n\n---\n\n`;
        }
        return md;
    }
    fetchAndCreateNotes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const giveaways = yield this.fetchGiveaways();
                const groups = this.groupByCustomCategories(giveaways);
                const folder = this.settings.folderName.trim() || "Game Giveaways";
                yield this.app.vault.createFolder(folder).catch(() => { });
                for (const [category, entries] of Object.entries(groups)) {
                    if (!entries.length)
                        continue;
                    const filePath = `${folder}/${category}.md`;
                    const content = this.formatGiveawayMarkdown(entries, category);
                    const existingFile = this.app.vault.getAbstractFileByPath(filePath);
                    if (existingFile instanceof obsidian.TFile) {
                        yield this.app.vault.modify(existingFile, content);
                    }
                    else {
                        yield this.app.vault.create(filePath, content);
                    }
                }
                new obsidian.Notice("Giveaways updated successfully.");
            }
            catch (error) {
                console.error(error);
                new obsidian.Notice("Failed to fetch or update giveaways.");
            }
        });
    }
    loadSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}
class GiveawaySettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Game Giveaway Plugin Settings" });
        new obsidian.Setting(containerEl)
            .setName("Folder Name")
            .setDesc("The folder where giveaway notes will be saved")
            .addText((text) => text
            .setPlaceholder("Game Giveaways")
            .setValue(this.plugin.settings.folderName)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.folderName = value;
            yield this.plugin.saveSettings();
        })));
        new obsidian.Setting(containerEl)
            .setName("Enable Auto Update")
            .setDesc("If enabled, updates giveaways automatically")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.autoUpdate).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.autoUpdate = value;
            yield this.plugin.saveSettings();
            this.display();
        })));
        if (this.plugin.settings.autoUpdate) {
            new obsidian.Setting(containerEl)
                .setName("Epic Games Weekly Schedule")
                .setDesc("Sync updates to Thursdays 6:04PM Israel time")
                .addToggle((toggle) => toggle.setValue(this.plugin.settings.epicScheduled).onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.epicScheduled = value;
                yield this.plugin.saveSettings();
                this.display();
            })));
            if (!this.plugin.settings.epicScheduled) {
                new obsidian.Setting(containerEl)
                    .setName("Update Interval (hours)")
                    .setDesc("Interval between automatic updates. 1 to 168 hours")
                    .addSlider((slider) => slider
                    .setLimits(1, 168, 1)
                    .setValue(this.plugin.settings.updateIntervalHours)
                    .setDynamicTooltip()
                    .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                    this.plugin.settings.updateIntervalHours = value;
                    yield this.plugin.saveSettings();
                })));
            }
        }
        new obsidian.Setting(containerEl)
            .setName("Enable Daily Updates")
            .setDesc("If enabled, updates giveaways every X hours daily")
            .addToggle((toggle) => toggle.setValue(this.plugin.settings.dailyUpdateEnabled).onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.dailyUpdateEnabled = value;
            yield this.plugin.saveSettings();
            this.display();
        })));
        if (this.plugin.settings.dailyUpdateEnabled) {
            new obsidian.Setting(containerEl)
                .setName("Daily Update Interval (hours)")
                .setDesc("Interval between daily updates. 1 to 24 hours")
                .addSlider((slider) => slider
                .setLimits(1, 24, 1)
                .setValue(this.plugin.settings.dailyUpdateInterval)
                .setDynamicTooltip()
                .onChange((value) => __awaiter(this, void 0, void 0, function* () {
                this.plugin.settings.dailyUpdateInterval = value;
                yield this.plugin.saveSettings();
            })));
        }
    }
}

module.exports = GiveawayByPlatformPlugin;
