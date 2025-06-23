import { Plugin, Notice, TFile, request, PluginSettingTab, App, Setting } from "obsidian";

interface Giveaway {
  id: number;
  title: string;
  worth: string;
  thumbnail?: string;
  image?: string;
  description: string;
  instructions: string;
  open_giveaway_url: string;
  published_date?: string;
  type?: string;
  platforms: string;
  end_date?: string;
  users?: number;
  status?: string;
  gamerpower_url?: string;
  open_giveaway?: string;
}

interface PluginSettings {
  folderName: string;
  autoUpdate: boolean;
  updateIntervalHours: number;
  epicScheduled: boolean;
  dailyUpdateEnabled: boolean;
  dailyUpdateInterval: number;
}

const DEFAULT_SETTINGS: PluginSettings = {
  folderName: "Game Giveaways",
  autoUpdate: false,
  updateIntervalHours: 24,
  epicScheduled: false,
  dailyUpdateEnabled: false,
  dailyUpdateInterval: 6,
};

export default class GiveawayByPlatformPlugin extends Plugin {
  settings!: PluginSettings;
  intervalHandle: number | null = null;
  timeoutHandle: number | null = null;
  dailyHandle: number | null = null;

  async onload() {
    await this.loadSettings();

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
  }

  onunload() {
    if (this.intervalHandle !== null) clearInterval(this.intervalHandle);
    if (this.timeoutHandle !== null) clearTimeout(this.timeoutHandle);
    if (this.dailyHandle !== null) clearInterval(this.dailyHandle);
  }

  scheduleAutoUpdate() {
    if (this.settings.epicScheduled) {
      const now = new Date();
      const thursday = new Date(now);
      thursday.setDate(now.getDate() + ((4 + 7 - now.getDay()) % 7));
      thursday.setHours(18, 4, 0, 0);
      if (thursday <= now) thursday.setDate(thursday.getDate() + 7);
      const msUntil = thursday.getTime() - now.getTime();
      this.timeoutHandle = window.setTimeout(() => {
        this.fetchAndCreateNotes();
        this.intervalHandle = window.setInterval(
          () => this.fetchAndCreateNotes(),
          7 * 24 * 60 * 60 * 1000
        );
      }, msUntil);
    } else {
      const ms = this.settings.updateIntervalHours * 60 * 60 * 1000;
      this.intervalHandle = window.setInterval(() => this.fetchAndCreateNotes(), ms);
    }
  }

  scheduleDailyUpdate() {
    const ms = this.settings.dailyUpdateInterval * 60 * 60 * 1000;
    this.dailyHandle = window.setInterval(() => this.fetchAndCreateNotes(), ms);
  }

  async fetchGiveaways(): Promise<Giveaway[]> {
    try {
      const responseText = await request({
        url: "https://www.gamerpower.com/api/giveaways",
        method: "GET",
      });
      const data = JSON.parse(responseText);
      if (!Array.isArray(data)) throw new Error("Unexpected API response format");
      return data.filter((g: Giveaway) => !g.platforms.includes("DRM-Free"));
    } catch (error) {
      throw new Error(`Failed to fetch giveaways: ${error}`);
    }
  }

  groupByCustomCategories(giveaways: Giveaway[]): Record<string, Giveaway[]> {
    const groups: Record<string, Giveaway[]> = {
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
      if (g.type?.toLowerCase() === "dlc") {
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

  formatGiveawayMarkdown(giveaways: Giveaway[], category: string): string {
    let md = `# ${category} Giveaways (${giveaways.length})\n\n`;
    for (const g of giveaways) {
      md += `## [${g.title}](${g.open_giveaway_url})\n`;
      if (g.thumbnail) md += `![Thumbnail](${g.thumbnail})\n\n`;
      md += `- **Worth**: ${g.worth}\n`;
      if (g.published_date) md += `- **Published**: ${g.published_date}\n`;
      if (g.end_date) md += `- **Ends**: ${g.end_date}\n`;
      if (g.users !== undefined) md += `- **Users Claimed**: ${g.users}\n`;
      md += `\n### Description\n${g.description}\n\n### Instructions\n${g.instructions}\n\n---\n\n`;
    }
    return md;
  }

  async fetchAndCreateNotes() {
    try {
      const giveaways = await this.fetchGiveaways();
      const groups = this.groupByCustomCategories(giveaways);
      const folder = this.settings.folderName.trim() || "Game Giveaways";

      await this.app.vault.createFolder(folder).catch(() => {});

      for (const [category, entries] of Object.entries(groups)) {
        if (!entries.length) continue;
        const filePath = `${folder}/${category}.md`;
        const content = this.formatGiveawayMarkdown(entries, category);
        const existingFile = this.app.vault.getAbstractFileByPath(filePath);

        if (existingFile instanceof TFile) {
          await this.app.vault.modify(existingFile, content);
        } else {
          await this.app.vault.create(filePath, content);
        }
      }

      new Notice("Giveaways updated successfully.");
    } catch (error) {
      console.error(error);
      new Notice("Failed to fetch or update giveaways.");
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class GiveawaySettingTab extends PluginSettingTab {
  plugin: GiveawayByPlatformPlugin;

  constructor(app: App, plugin: GiveawayByPlatformPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl("h2", { text: "Game Giveaway Plugin Settings" });

    new Setting(containerEl)
      .setName("Folder Name")
      .setDesc("The folder where giveaway notes will be saved")
      .addText((text) =>
        text
          .setPlaceholder("Game Giveaways")
          .setValue(this.plugin.settings.folderName)
          .onChange(async (value) => {
            this.plugin.settings.folderName = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable Auto Update")
      .setDesc("If enabled, updates giveaways automatically")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoUpdate).onChange(async (value) => {
          this.plugin.settings.autoUpdate = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.autoUpdate) {
      new Setting(containerEl)
        .setName("Epic Games Weekly Schedule")
        .setDesc("Sync updates to Thursdays 6:04PM Israel time")
        .addToggle((toggle) =>
          toggle.setValue(this.plugin.settings.epicScheduled).onChange(async (value) => {
            this.plugin.settings.epicScheduled = value;
            await this.plugin.saveSettings();
            this.display();
          })
        );

      if (!this.plugin.settings.epicScheduled) {
        new Setting(containerEl)
          .setName("Update Interval (hours)")
          .setDesc("Interval between automatic updates. 1 to 168 hours")
          .addSlider((slider) =>
            slider
              .setLimits(1, 168, 1)
              .setValue(this.plugin.settings.updateIntervalHours)
              .setDynamicTooltip()
              .onChange(async (value) => {
                this.plugin.settings.updateIntervalHours = value;
                await this.plugin.saveSettings();
              })
          );
      }
    }

    new Setting(containerEl)
      .setName("Enable Daily Updates")
      .setDesc("If enabled, updates giveaways every X hours daily")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.dailyUpdateEnabled).onChange(async (value) => {
          this.plugin.settings.dailyUpdateEnabled = value;
          await this.plugin.saveSettings();
          this.display();
        })
      );

    if (this.plugin.settings.dailyUpdateEnabled) {
      new Setting(containerEl)
        .setName("Daily Update Interval (hours)")
        .setDesc("Interval between daily updates. 1 to 24 hours")
        .addSlider((slider) =>
          slider
            .setLimits(1, 24, 1)
            .setValue(this.plugin.settings.dailyUpdateInterval)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.dailyUpdateInterval = value;
              await this.plugin.saveSettings();
            })
        );
    }
  }
}
