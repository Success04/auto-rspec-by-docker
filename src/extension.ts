// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "auto-rspec-by-docker" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('auto-rspec-by-docker.runRSpecAtCursor', () => {
		runRSpecAtCursor();
	});

	context.subscriptions.push(disposable);
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

		// ターミナルを開いてコマンドを実行
		const terminal = vscode.window.createTerminal({
			name: 'RSpec Test',
			cwd: cwd
		});
		
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

// This method is called when your extension is deactivated
export function deactivate() {}
