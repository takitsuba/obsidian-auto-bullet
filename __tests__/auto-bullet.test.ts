// Obsidianの環境をモックする代わりに、必要なインターフェースだけをインポート
import { Editor } from 'obsidian';

// モックの作成
class MockEditor implements Partial<Editor> {
  private lines: string[] = [''];
  private cursorPosition = { line: 0, ch: 0 };

  constructor(initialContent: string[] = ['']) {
    this.lines = initialContent;
  }

  getLine(lineNumber: number): string {
    return this.lines[lineNumber] || '';
  }

  getCursor(): { line: number; ch: number } {
    return this.cursorPosition;
  }

  setCursor(position: { line: number; ch: number }): void {
    this.cursorPosition = position;
  }

  replaceRange(
    replacement: string,
    from: { line: number; ch: number },
    to: { line: number; ch: number }
  ): void {
    const line = this.lines[from.line] || '';
    const beforeCursor = line.substring(0, from.ch);
    const afterCursor = line.substring(to.ch);
    this.lines[from.line] = beforeCursor + replacement + afterCursor;
  }

  // テスト用のヘルパーメソッド
  simulateTyping(text: string): void {
    for (const char of text) {
      const line = this.lines[this.cursorPosition.line] || '';
      const beforeCursor = line.substring(0, this.cursorPosition.ch);
      const afterCursor = line.substring(this.cursorPosition.ch);
      this.lines[this.cursorPosition.line] = beforeCursor + char + afterCursor;
      this.cursorPosition.ch += 1;
    }
  }

  getCurrentContent(): string[] {
    return [...this.lines];
  }
}

// 直接ハンドラー関数をテスト
describe('AutoBullet機能のテスト', () => {
  let mockEditor: MockEditor;

  // handleEditorChangeの実装（main.tsから抽出）
  function handleEditorChange(editor: Editor, settings: any) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const lastChar = line.charAt(cursor.ch - 1);

    // Check if the last character typed was a space (half-width or full-width) or tab
    // and if the corresponding setting is enabled
    if ((lastChar === ' ' && settings.enableHalfWidthSpace) ||
      (lastChar === '\t' && settings.enableTab) ||
      (lastChar === '　' && settings.enableFullWidthSpace)) {

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

  beforeEach(() => {
    // エディタの準備
    mockEditor = new MockEditor();
  });

  test('半角スペースで箇条書きが挿入される', () => {
    // 設定
    const settings = {
      enableHalfWidthSpace: true,
      enableFullWidthSpace: true,
      enableTab: true
    };

    // 行の先頭で半角スペースを入力
    mockEditor.simulateTyping(' ');

    // ハンドラーを実行
    handleEditorChange(mockEditor as unknown as Editor, settings);

    // 箇条書きが挿入されたことを確認
    expect(mockEditor.getCurrentContent()[0]).toBe('- ');
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 2 });
  });

  test('全角スペースで箇条書きが挿入される', () => {
    // 設定
    const settings = {
      enableHalfWidthSpace: true,
      enableFullWidthSpace: true,
      enableTab: true
    };

    // 行の先頭で全角スペースを入力
    mockEditor.simulateTyping('　');

    // ハンドラーを実行
    handleEditorChange(mockEditor as unknown as Editor, settings);

    // 箇条書きが挿入されたことを確認
    expect(mockEditor.getCurrentContent()[0]).toBe('- ');
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 2 });
  });

  test('タブで箇条書きが挿入される', () => {
    // 設定
    const settings = {
      enableHalfWidthSpace: true,
      enableFullWidthSpace: true,
      enableTab: true
    };

    // 行の先頭でタブを入力
    mockEditor.simulateTyping('\t');

    // ハンドラーを実行
    handleEditorChange(mockEditor as unknown as Editor, settings);

    // 箇条書きが挿入されたことを確認
    expect(mockEditor.getCurrentContent()[0]).toBe('- ');
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 2 });
  });

  test('行の先頭でない場合は箇条書きが挿入されない', () => {
    // 設定
    const settings = {
      enableHalfWidthSpace: true,
      enableFullWidthSpace: true,
      enableTab: true
    };

    // 先頭に文字がある状態でスペースを入力
    mockEditor.simulateTyping('テキスト ');

    // ハンドラーを実行
    handleEditorChange(mockEditor as unknown as Editor, settings);

    // 箇条書きが挿入されないことを確認
    expect(mockEditor.getCurrentContent()[0]).toBe('テキスト ');
  });

  test('設定が無効の場合は箇条書きが挿入されない', () => {
    // 設定を無効化
    const settings = {
      enableHalfWidthSpace: false,
      enableFullWidthSpace: false,
      enableTab: false
    };

    // 行の先頭でスペースを入力
    mockEditor.simulateTyping(' ');

    // ハンドラーを実行
    handleEditorChange(mockEditor as unknown as Editor, settings);

    // 箇条書きが挿入されないことを確認
    expect(mockEditor.getCurrentContent()[0]).toBe(' ');
  });

  test('既に箇条書きがある場合は重複して挿入されない', () => {
    // 設定
    const settings = {
      enableHalfWidthSpace: true,
      enableFullWidthSpace: true,
      enableTab: true
    };

    // 既に箇条書きがある状態を作成
    mockEditor = new MockEditor(['- ']);
    mockEditor.setCursor({ line: 0, ch: 2 });

    // スペースを入力
    mockEditor.simulateTyping(' ');

    // ハンドラーを実行
    handleEditorChange(mockEditor as unknown as Editor, settings);

    // 箇条書きが重複して挿入されないことを確認
    // スペースが入力されるので「-  」になる
    expect(mockEditor.getCurrentContent()[0]).toBe('-  ');
  });
});

// 番号付きリストのHome key機能テスト
describe('番号付きリストのHome key機能テスト', () => {
  let mockEditor: MockEditor;

  // moveCursorAfterNumberedListの実装（main.tsから抽出）
  function moveCursorAfterNumberedList(editor: Editor) {
    try {
      const cursor = editor.getCursor();
      const line = editor.getLine(cursor.line);

      // Check if the line is a numbered list
      const match = line.match(/^(\s*)(\d+\.\s)/);
      if (match) {
        const indentLength = match[1].length;
        const numberPartLength = match[2].length;
        const targetPosition = indentLength + numberPartLength;

        // Move cursor only if it's not already at the target position
        if (cursor.ch !== targetPosition) {
          editor.setCursor({ line: cursor.line, ch: targetPosition });
          return true;
        }
      }
    } catch (error) {
      console.error(`Error in moveCursorAfterNumberedList: ${error.message}`);
    }
    return false;
  }

  beforeEach(() => {
    mockEditor = new MockEditor();
  });

  test('基本的な番号付きリストでカーソルが正しい位置に移動する', () => {
    // 番号付きリストを設定
    mockEditor = new MockEditor(['1. テストアイテム']);
    mockEditor.setCursor({ line: 0, ch: 0 }); // 行の先頭にカーソル

    // 関数を実行
    const result = moveCursorAfterNumberedList(mockEditor as unknown as Editor);

    // カーソルが「1. 」の後に移動したことを確認
    expect(result).toBe(true);
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 3 });
  });

  test('インデントありの番号付きリストでカーソルが正しい位置に移動する', () => {
    // インデントありの番号付きリストを設定
    mockEditor = new MockEditor(['    2. インデントされたアイテム']);
    mockEditor.setCursor({ line: 0, ch: 0 }); // 行の先頭にカーソル

    // 関数を実行
    const result = moveCursorAfterNumberedList(mockEditor as unknown as Editor);

    // カーソルが「    2. 」の後に移動したことを確認
    expect(result).toBe(true);
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 7 });
  });

  test('タブインデントの番号付きリストでカーソルが正しい位置に移動する', () => {
    // タブインデントの番号付きリストを設定
    mockEditor = new MockEditor(['\t10. タブインデントアイテム']);
    mockEditor.setCursor({ line: 0, ch: 0 }); // 行の先頭にカーソル

    // 関数を実行
    const result = moveCursorAfterNumberedList(mockEditor as unknown as Editor);

    // カーソルが「\t10. 」の後に移動したことを確認
    expect(result).toBe(true);
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 5 });
  });

  test('既に正しい位置にカーソルがある場合は移動しない', () => {
    // 番号付きリストを設定
    mockEditor = new MockEditor(['3. アイテム']);
    mockEditor.setCursor({ line: 0, ch: 3 }); // すでに正しい位置にカーソル

    // 関数を実行
    const result = moveCursorAfterNumberedList(mockEditor as unknown as Editor);

    // カーソルが移動しないことを確認
    expect(result).toBe(false);
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 3 });
  });

  test('番号付きリストでない行では何もしない', () => {
    // 通常のテキストを設定
    mockEditor = new MockEditor(['これは番号付きリストではありません']);
    mockEditor.setCursor({ line: 0, ch: 0 });

    // 関数を実行
    const result = moveCursorAfterNumberedList(mockEditor as unknown as Editor);

    // 何も変更されないことを確認
    expect(result).toBe(false);
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 0 });
  });

  test('箇条書きリスト（- ）では何もしない', () => {
    // 箇条書きリストを設定
    mockEditor = new MockEditor(['- 箇条書きアイテム']);
    mockEditor.setCursor({ line: 0, ch: 0 });

    // 関数を実行
    const result = moveCursorAfterNumberedList(mockEditor as unknown as Editor);

    // 何も変更されないことを確認
    expect(result).toBe(false);
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 0 });
  });

  test('複数桁の番号でカーソルが正しい位置に移動する', () => {
    // 複数桁の番号付きリストを設定
    mockEditor = new MockEditor(['123. 大きな番号のアイテム']);
    mockEditor.setCursor({ line: 0, ch: 0 });

    // 関数を実行
    const result = moveCursorAfterNumberedList(mockEditor as unknown as Editor);

    // カーソルが「123. 」の後に移動したことを確認
    expect(result).toBe(true);
    expect(mockEditor.getCursor()).toEqual({ line: 0, ch: 5 });
  });
});
