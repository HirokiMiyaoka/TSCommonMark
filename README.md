# TSCommonMark

CommonMark parser for TypeScript.

http://spec.commonmark.org/

## Use

## Develop

### Prepare

```
npm i -g typescript
```

### Build

```
npm run build
```

## Test

http://spec.commonmark.org/0.27/

```
npm run test
```

# TSCommonMark

TypeScript用のCommonMarkのパーサーです。
まぁTypeScript用といっても型定義があるくらいです。

とりあえず以下が目標。

* Webブラウザの場合、DOMツリーによる出力に対応。
    * markedみたいに文字列のソースではない。
* サーバーサイドでも使えるよう文字列のも用意する。
    * markedみたいな感じで。
* ちゃんと型定義がある。
* CommonMarkの中にあるサンプルをすべてこなす。
    * テスト駆動みたいな感じで、ここのテストを通るようにしながら開発。

テストが今の対応版の0.27ですでに600近くあったので、めちゃくちゃまったり作業することになるので期待しないでね！！

文法については実装しながら書いていく予定。

[Cheatsheet](./Cheatsheet.md)

## テストについて

何かテスト用のモジュール入れるの面倒くさかったり、比較のこと考えると割と単純なので自分で書いた。

`test/` 以下に `TEST.md` と `TEST.html` を用意し、それぞれがソースと結果に対応している。
ちゃんと結果が正しく出力されていればOKとする。

一応今回の目標であるCommonMarkのサンプルをテストとして使うので、答えの出力までちょっとがんばることにした（ので、一部やっていることは無駄があるが許して）。

## 進捗

* コードブロック記法に対応(一部)

## 今後について

今はもろもろの関係で、markedみたいに `cmarked` なる関数をエクスポートしているが、ここらへんもいろいろ変えていく。
どうやって切り出すかとかは考え中。
