import { App, Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface AutoBulletSettings {
	enabled: boolean;
}

const DEFAULT_SETTINGS: AutoBulletSettings = {
	enabled: true
}

export default class AutoBulletPlugin extends Plugin {
	settings: AutoBulletSettings;

	async onload() {
		await this.loadSettings();

		// Register event to handle key presses
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				if (!this.settings.enabled) return;
				
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const lastChar = line.charAt(cursor.ch - 1);
				
				// Check if the last character typed was a space or tab
				if (lastChar === ' ' || lastChar === '\t') {
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

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new AutoBulletSettingTab(this.app, this));
	}

	onunload() {
		// Clean up when the plugin is disabled
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class AutoBulletSettingTab extends PluginSettingTab {
	plugin: AutoBulletPlugin;

	constructor(app: App, plugin: AutoBulletPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('自動箇条書き')
			.setDesc('行の先頭でスペースまたはタブを入力すると、自動的に箇条書き（- ）が挿入されます。')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabled)
				.onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
				}));
	}
}
