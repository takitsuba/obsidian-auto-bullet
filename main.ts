import { Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface AutoBulletSettings {
	enableHalfWidthSpace: boolean;
	enableFullWidthSpace: boolean;
	enableTab: boolean;
}

const DEFAULT_SETTINGS: AutoBulletSettings = {
	enableHalfWidthSpace: true,
	enableFullWidthSpace: true,
	enableTab: true
};

export default class AutoBulletPlugin extends Plugin {
	settings: AutoBulletSettings;

	async onload() {
		// Load settings
		await this.loadSettings();

		// Add settings tab
		this.addSettingTab(new AutoBulletSettingTab(this.app, this));

		// Register event to handle key presses
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const lastChar = line.charAt(cursor.ch - 1);
				
				// Check if the last character typed was a space (half-width or full-width) or tab
				// and if the corresponding setting is enabled
				if ((lastChar === ' ' && this.settings.enableHalfWidthSpace) || 
					(lastChar === '\t' && this.settings.enableTab) || 
					(lastChar === '　' && this.settings.enableFullWidthSpace)) {
					
					const textBeforeCursor = line.slice(0, cursor.ch);
					
					// Check if we're at the beginning of a line (only whitespace before cursor)
					if (textBeforeCursor.trim() === '') {
						// Insert a bullet point
						const bulletPoint = "- ";
						editor.replaceRange(bulletPoint, 
							{ line: cursor.line, ch: 0 }, 
							{ line: cursor.line, ch: textBeforeCursor.length }
						);
						
						// Move cursor after the bullet point
						editor.setCursor({ line: cursor.line, ch: bulletPoint.length });
					}
				}
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// Clean up when the plugin is disabled
	}
}

class AutoBulletSettingTab extends PluginSettingTab {
	plugin: AutoBulletPlugin;

	constructor(app: any, plugin: AutoBulletPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Auto Bullet Settings' });

		new Setting(containerEl)
			.setName('Half-width Space')
			.setDesc('Insert bullet points when you press a half-width space at the beginning of a line')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableHalfWidthSpace)
				.onChange(async (value) => {
					this.plugin.settings.enableHalfWidthSpace = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Full-width Space')
			.setDesc('Insert bullet points when you press a full-width space at the beginning of a line')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFullWidthSpace)
				.onChange(async (value) => {
					this.plugin.settings.enableFullWidthSpace = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Tab')
			.setDesc('Insert bullet points when you press a tab at the beginning of a line')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableTab)
				.onChange(async (value) => {
					this.plugin.settings.enableTab = value;
					await this.plugin.saveSettings();
				}));
	}
}
