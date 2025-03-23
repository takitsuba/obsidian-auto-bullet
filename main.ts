import { Editor, Plugin, PluginSettingTab, Setting, Notice, MarkdownView } from 'obsidian';

// CodeMirror type definitions
interface CodeMirrorEditor {
	getCursor(): { line: number; ch: number };
	getLine(line: number): string;
	setCursor(pos: { line: number; ch: number }): void;
	on(event: string, callback: (cm: CodeMirrorEditor, event: KeyboardEvent) => void): void;
}

// Extended type definition for Obsidian Plugin
declare module 'obsidian' {
	interface Plugin {
		registerCodeMirror(callback: (cm: CodeMirrorEditor) => void): void;
	}
}

interface AutoBulletSettings {
	enableHalfWidthSpace: boolean;
	enableFullWidthSpace: boolean;
	enableTab: boolean;
	customizeHomeKey: boolean;
}

const DEFAULT_SETTINGS: AutoBulletSettings = {
	enableHalfWidthSpace: true,
	enableFullWidthSpace: true,
	enableTab: true,
	customizeHomeKey: true
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
			this.app.workspace.on('editor-change', this.handleEditorChange)
		);

		// Add a command that can be triggered from the command palette
		this.addCommand({
			id: 'move-cursor-after-bullet',
			name: 'Move cursor after bullet point',
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);

				// バレットポイントの行の場合は「- 」の後ろにカーソルを移動
				if (line.trim().startsWith('- ')) {
					this.moveCursorAfterBullet(editor);
				} else {
					// 通常の行の場合は行の先頭にカーソルを移動（標準のCtrl+Aと同様）
					editor.setCursor({ line: cursor.line, ch: 0 });
				}
			},
			hotkeys: [
				{
					modifiers: ['Ctrl'],
					key: 'a',
				}
			]
		});

		// Try another approach with CodeMirror
		this.registerCodeMirror((cm: CodeMirrorEditor) => {
			cm.on('keydown', (instance, event) => {
				try {
					// Handle Ctrl+A
					if (event.key === 'a' && event.ctrlKey && !event.metaKey && this.settings.customizeHomeKey) {
						const view = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (view) {
							const editor = view.editor;
							const cursor = editor.getCursor();
							const line = editor.getLine(cursor.line);

							// バレットポイントの行の場合は「- 」の後ろにカーソルを移動
							if (line.trim().startsWith('- ')) {
								const result = this.moveCursorAfterBullet(editor);
								if (result) {
									// Only prevent default if we successfully moved the cursor
									event.preventDefault();
									event.stopPropagation();
									return false;
								}
							} else {
								// 通常の行の場合は行の先頭にカーソルを移動
								editor.setCursor({ line: cursor.line, ch: 0 });
								event.preventDefault();
								event.stopPropagation();
								return false;
							}
						}
					}
				} catch (error) {
					new Notice(`Error: ${error.message}`);
				}
			});
		});
	}

	// Function to move cursor after bullet point
	moveCursorAfterBullet(editor: Editor) {
		try {
			const cursor = editor.getCursor();
			const line = editor.getLine(cursor.line);

			// Check if the line is a bullet point
			if (line.trim().startsWith('- ')) {
				// Find index after leading whitespace
				let indentIndex = 0;
				while (indentIndex < line.length &&
					(line[indentIndex] === ' ' || line[indentIndex] === '\t' || line[indentIndex] === '　')) {
					indentIndex++;
				}

				// Calculate position after the '- ' bullet point
				if (line.substring(indentIndex).startsWith('- ')) {
					const bulletEndPosition = indentIndex + 2; // Length of '- ' is 2

					// Move cursor only if it's not already at the bullet end position
					if (cursor.ch !== bulletEndPosition) {
						editor.setCursor({ line: cursor.line, ch: bulletEndPosition });
						return true;
					}
				}
			}
		} catch (error) {
			console.error(`Error in moveCursorAfterBullet: ${error.message}`);
		}
		return false;
	}

	private handleEditorChange = (editor: Editor) => {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const lastChar = line.charAt(cursor.ch - 1);

		// Check if the cursor is inside a code block
		const isInCodeBlock = (line: string) => line.trim().startsWith('```');

		// Check if the cursor is inside a math block
		const isInMathBlock = (line: string) => line.trim().startsWith('$$');

		// Check if the current line or any previous line is a code block or math block
		let inCodeBlock = false;
		let inMathBlock = false;
		for (let i = 0; i <= cursor.line; i++) {
			const currentLine = editor.getLine(i);
			if (isInCodeBlock(currentLine)) {
				inCodeBlock = !inCodeBlock;
			}
			if (isInMathBlock(currentLine)) {
				inMathBlock = !inMathBlock;
			}
		}

		// If inside a code block, math block, or the current line is a code block or math block end, do not add bullet points
		if (inCodeBlock || inMathBlock || isInCodeBlock(line) || isInMathBlock(line)) {
			return;
		}

		// Check if the line is a heading
		const isHeading = line.trim().startsWith('#');

		// If the line is a heading, do not add bullet points
		if (isHeading) {
			return;
		}

		// Check if the last character typed was a space (half-width or full-width) or tab
		// and if the corresponding setting is enabled
		if ((lastChar === ' ' && this.settings.enableHalfWidthSpace) ||
			(lastChar === '\t' && this.settings.enableTab) ||
			(lastChar === '　' && this.settings.enableFullWidthSpace)) {

			const textBeforeCursor = line.slice(0, cursor.ch);

			// Check if we're at the beginning of a line (only whitespace before cursor)
			if (textBeforeCursor.trim() === '') {
				// Check if the line already has a bullet point
				const lineWithoutWhitespace = line.trim();
				if (!lineWithoutWhitespace.startsWith('- ')) {
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
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		// Clean up is handled automatically by this.registerEvent
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

		new Setting(containerEl)
			.setName('Half-width space')
			.setDesc('Insert bullet points when you press a half-width space at the beginning of a line')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableHalfWidthSpace)
				.onChange(async (value) => {
					this.plugin.settings.enableHalfWidthSpace = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Full-width space')
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

		new Setting(containerEl)
			.setName('Customize home key')
			.setDesc('Move cursor after bullet point (- ) when pressing Home or Ctrl+A in a bullet line')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.customizeHomeKey)
				.onChange(async (value) => {
					this.plugin.settings.customizeHomeKey = value;
					await this.plugin.saveSettings();
				}));
	}
}

