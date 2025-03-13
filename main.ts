import { Editor, Plugin } from 'obsidian';

export default class AutoBulletPlugin extends Plugin {
	async onload() {
		// Register event to handle key presses
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const lastChar = line.charAt(cursor.ch - 1);
				
				// Check if the last character typed was a space (half-width or full-width) or tab
				if (lastChar === ' ' || lastChar === '\t' || lastChar === '　') {
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

	onunload() {
		// Clean up when the plugin is disabled
	}
}
