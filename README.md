# RSpec Runner for Docker

VS Code拡張機能で、カーソル位置のRSpecテストをdocker-composeで実行します。

## 機能

- カーソルがあるRSpecテストファイルの特定の行のテストを実行
- `Cmd+U` (macOS) のショートカットで簡単実行
- docker-composeを使用してRailsコンテナ内でテストを実行

## 使用方法

1. RSpecテストファイル（`*_spec.rb`）を開く
2. 実行したいテストケースの行にカーソルを置く
3. `Cmd+U`を押す、またはコマンドパレット（`Cmd+Shift+P`）で "Run RSpec at Cursor" を実行

## 設定

VS Codeの設定で以下の項目をカスタマイズできます：

### `rspecRunner.dockerCommand`
- デフォルト: `docker-compose exec -e RAILS_ENV=test rails-api bundle exec rspec`
- RSpecテストを実行するためのDockerコマンド

### `rspecRunner.workspaceRootPath`
- デフォルト: 空文字（現在のワークスペースルートを使用）
- docker-composeコマンドを実行する作業ディレクトリのパス

## 例

`rails-api/spec/models/agency/omi/omi_match_cancel_info_spec.rb`の23行目にカーソルがある場合：

実行されるコマンド:
```bash
docker-compose exec -e RAILS_ENV=test rails-api bundle exec rspec spec/models/agency/omi/omi_match_cancel_info_spec.rb:23
```

## 要件

- VS Code 1.96.0以上
- プロジェクトルートにdocker-compose.ymlが存在すること
- `rails-api`という名前のサービスがdocker-compose.ymlに定義されていること

## インストール

### 方法1: VSIXファイルから
```bash
code --install-extension auto-rspec-by-docker-0.0.1.vsix
```

### 方法2: ソースからビルド
```bash
git clone [repository-url]
cd auto-rspec-by-docker
npm install
npm run compile
npm install -g @vscode/vsce
vsce package
code --install-extension auto-rspec-by-docker-0.0.1.vsix
```

## 開発

```bash
# 依存関係をインストール
npm install

# コンパイル
npm run compile

# 監視モードでコンパイル
npm run watch

# パッケージ化
vsce package
```

## ライセンス

MIT

## 作成者

開発チーム

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
