// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "auto-rspec-by-docker" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable1 = vscode.commands.registerCommand('auto-rspec-by-docker.runRSpecAtCursor', () => {
		runRSpecAtCursor();
	});

	const disposable2 = vscode.commands.registerCommand('auto-rspec-by-docker.runRSpecForMethod', () => {
		runRSpecForMethod();
	});

	context.subscriptions.push(disposable1, disposable2);
}

function runRSpecAtCursor() {
	const activeEditor = vscode.window.activeTextEditor;
	
	if (!activeEditor) {
		vscode.window.showErrorMessage('アクティブなエディタが見つかりません');
		return;
	}

	const document = activeEditor.document;
	const filePath = document.fileName;
	const cursorPosition = activeEditor.selection.active;
	const lineNumber = cursorPosition.line + 1; // VS Codeは0ベースなので1を足す

	// specファイルかどうかチェック
	if (!filePath.includes('spec') || !filePath.endsWith('_spec.rb')) {
		vscode.window.showErrorMessage('RSpecテストファイルではありません');
		return;
	}

	try {
		// 設定を取得
		const config = vscode.workspace.getConfiguration('rspecRunner');
		const dockerCommand = config.get<string>('dockerCommand') || 'docker-compose exec -e RAILS_ENV=test rails-api bundle exec rspec';
		const workspaceRootPath = config.get<string>('workspaceRootPath') || '';

		// ファイルパスからspec以降の部分を抽出
		const specIndex = filePath.indexOf('spec');
		if (specIndex === -1) {
			vscode.window.showErrorMessage('specディレクトリが見つかりません');
			return;
		}

		const relativePath = filePath.substring(specIndex);
		const testPath = `${relativePath}:${lineNumber}`;

		// docker-composeコマンドを構築
		const command = `${dockerCommand} ${testPath}`;

		// ワークスペースのルートディレクトリを取得
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('ワークスペースフォルダが見つかりません');
			return;
		}

		// 作業ディレクトリを設定（workspaceRootPathが設定されている場合はそれを使用）
		let cwd = workspaceFolder.uri.fsPath;
		if (workspaceRootPath) {
			cwd = path.resolve(cwd, workspaceRootPath);
		}

		// 既存のターミナルを検索または新規作成
		let terminal = getOrCreateTerminal(cwd);
		
		terminal.show();
		terminal.sendText(command);

		// テスト実行情報を表示
		const infoMessage = `RSpecテストを実行中: ${testPath}`;
		console.log(infoMessage);
		console.log(`Command: ${command}`);
		console.log(`Working directory: ${cwd}`);
		
		vscode.window.showInformationMessage(infoMessage);

	} catch (error) {
		const errorMessage = `エラーが発生しました: ${error}`;
		console.error(errorMessage);
		vscode.window.showErrorMessage(errorMessage);
	}
}

/**
 * 既存のRSpecテスト用ターミナルを検索し、見つからない場合は新規作成する
 */
function getOrCreateTerminal(cwd: string): vscode.Terminal {
	const terminalName = 'RSpec Test';
	
	// 既存のターミナルを検索
	const existingTerminal = vscode.window.terminals.find(terminal => 
		terminal.name === terminalName && terminal.exitStatus === undefined
	);

	if (existingTerminal) {
		console.log('既存のターミナルを使用します');
		return existingTerminal;
	}

	// 既存のターミナルが見つからない場合は新規作成
	console.log('新しいターミナルを作成します');
	return vscode.window.createTerminal({
		name: terminalName,
		cwd: cwd
	});
}

/**
 * カーソル位置のメソッドに対応するテストコードを検索・実行する
 */
async function runRSpecForMethod() {
	const activeEditor = vscode.window.activeTextEditor;
	
	if (!activeEditor) {
		vscode.window.showErrorMessage('アクティブなエディタが見つかりません');
		return;
	}

	const document = activeEditor.document;
	const filePath = document.fileName;
	const cursorPosition = activeEditor.selection.active;

	// Rubyファイルかどうかチェック
	if (!filePath.endsWith('.rb') || filePath.includes('spec')) {
		vscode.window.showErrorMessage('Rubyソースファイルではありません（specファイルは対象外）');
		return;
	}

	try {
		// カーソル位置のメソッド名を取得
		const methodName = getMethodNameAtCursor(document, cursorPosition);
		if (!methodName) {
			vscode.window.showErrorMessage('カーソル位置にメソッド定義が見つかりません。"def メソッド名" の行にカーソルを合わせてください。');
			return;
		}

		// ファイル名とクラス名を取得
		const className = getClassNameFromFile(document);
		const fileName = path.basename(filePath, '.rb');

		console.log(`メソッド名: ${methodName}, クラス名: ${className}, ファイル名: ${fileName}`);

		// 対応するテストファイルを見つける
		const testFilePath = await findTestFile(filePath, fileName, className);
		if (!testFilePath) {
			vscode.window.showErrorMessage(`対応するテストファイルが見つかりません。ファイル名: ${fileName}, クラス名: ${className}`);
			return;
		}

		// テストファイル内で該当のテストコードを探す
		const testLineNumber = await findTestForMethod(testFilePath, methodName);
		if (!testLineNumber) {
			vscode.window.showErrorMessage(`メソッド "${methodName}" に対応するテストが見つかりません`);
			return;
		}

		// テストを実行
		await runSpecificTest(testFilePath, testLineNumber);

	} catch (error) {
		const errorMessage = `エラーが発生しました: ${error}`;
		console.error(errorMessage);
		vscode.window.showErrorMessage(errorMessage);
	}
}

/**
 * カーソル位置のメソッド名を取得する
 */
function getMethodNameAtCursor(document: vscode.TextDocument, position: vscode.Position): string | null {
	const line = document.lineAt(position.line);
	const lineText = line.text.trim();
	
	// def メソッド名 のパターンをチェック
	const methodMatch = lineText.match(/^\s*def\s+([a-zA-Z_]\w*)/);
	if (methodMatch) {
		return methodMatch[1];
	}
	
	return null;
}

/**
 * ファイルからクラス名を取得する
 */
function getClassNameFromFile(document: vscode.TextDocument): string | null {
	const text = document.getText();
	const classMatch = text.match(/class\s+([A-Z]\w*)/);
	return classMatch ? classMatch[1] : null;
}

/**
 * 対応するテストファイルを見つける
 */
async function findTestFile(originalFilePath: string, fileName: string, className: string | null): Promise<string | null> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		return null;
	}

	const specPattern = `**/*${fileName}_spec.rb`;
	const files = await vscode.workspace.findFiles(specPattern);
	
	if (files.length > 0) {
		return files[0].fsPath;
	}

	// クラス名ベースでも検索
	if (className) {
		const classSpecPattern = `**/*${className.toLowerCase()}_spec.rb`;
		const classFiles = await vscode.workspace.findFiles(classSpecPattern);
		if (classFiles.length > 0) {
			return classFiles[0].fsPath;
		}
	}

	return null;
}

/**
 * テストファイル内で該当のテストコードを探す（部分一致）
 */
async function findTestForMethod(testFilePath: string, methodName: string): Promise<number | null> {
	try {
		const content = fs.readFileSync(testFilePath, 'utf8');
		const lines = content.split('\n');
		
		// メソッド名を含むテストブロックを探す（部分一致）
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			// it "..." や context "..." や describe "..." の行でメソッド名が含まれているかチェック
			if ((line.includes('it ') || line.includes('context ') || line.includes('describe ')) && 
			    line.includes(methodName)) {
				return i + 1; // 1ベースの行番号を返す
			}
		}
		
		return null;
	} catch (error) {
		console.error(`テストファイルの読み込みエラー: ${error}`);
		return null;
	}
}

/**
 * 特定のテストを実行する
 */
async function runSpecificTest(testFilePath: string, lineNumber: number) {
	try {
		// 設定を取得
		const config = vscode.workspace.getConfiguration('rspecRunner');
		const dockerCommand = config.get<string>('dockerCommand') || 'docker-compose exec -e RAILS_ENV=test rails-api bundle exec rspec';
		const workspaceRootPath = config.get<string>('workspaceRootPath') || '';

		// ファイルパスからspec以降の部分を抽出
		const specIndex = testFilePath.indexOf('spec');
		if (specIndex === -1) {
			vscode.window.showErrorMessage('specディレクトリが見つかりません');
			return;
		}

		const relativePath = testFilePath.substring(specIndex);
		const testPath = `${relativePath}:${lineNumber}`;

		// docker-composeコマンドを構築
		const command = `${dockerCommand} ${testPath}`;

		// ワークスペースのルートディレクトリを取得
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('ワークスペースフォルダが見つかりません');
			return;
		}

		// 作業ディレクトリを設定（workspaceRootPathが設定されている場合はそれを使用）
		let cwd = workspaceFolder.uri.fsPath;
		if (workspaceRootPath) {
			cwd = path.resolve(cwd, workspaceRootPath);
		}

		// 既存のターミナルを検索または新規作成
		let terminal = getOrCreateTerminal(cwd);
		
		terminal.show();
		terminal.sendText(command);

		// テスト実行情報を表示
		const infoMessage = `対応するテストを実行中: ${testPath}`;
		console.log(infoMessage);
		console.log(`Command: ${command}`);
		console.log(`Working directory: ${cwd}`);
		
		vscode.window.showInformationMessage(infoMessage);

	} catch (error) {
		const errorMessage = `エラーが発生しました: ${error}`;
		console.error(errorMessage);
		vscode.window.showErrorMessage(errorMessage);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
