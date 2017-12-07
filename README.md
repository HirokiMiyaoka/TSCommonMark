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

http://spec.commonmark.org/0.28/

### All

```
npm run test
```

### Select

```
npm run test -- -t TESTNAME|TESTNUMBER
```

Test `test/TESTNAME.md` or `test/TESTNUMBER.md` .

If TESTNUMBER.length is less than 4 digits, 0 is added.

```
10    =>  0010 => test/0010.md
1000  =>  1000 => test/1000.md
10000 => 10000 => test/10000.md
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

テストが今の対応版の0.28ですでに600近くあったので、めちゃくちゃまったり作業します！！完成の期待をしないでね！！

文法については実装しながら書いていく予定。

[Cheatsheet](./Cheatsheet.md)

## テストについて

何かテスト用のモジュール入れるの面倒くさかったり、比較のこと考えると割と単純なので自分で書いた。

`test/` 以下に `TEST.md` と `TEST.html` を用意し、それぞれがソースと結果に対応している。
ちゃんと結果が正しく出力されていればOKとする。

一応今回の目標であるCommonMarkのサンプルをテストとして使うので、答えの出力までちょっとがんばることにした（ので、一部やっていることは無駄があるが許して）。

### サポートするスクリプト

いくつかテストをサポートするスクリプトがある。
開発者しか使わない関係上、ビルドしないと使えないので注意。

* script/gettests.js
    * 現在の最新のテストを、`newtest` に入れる。
* script/difftests.js
    * 現在のテストと、`newtest` にあるテストの比較を行う。

#### ビルド方法

```
npm run script
```

#### 実行方法

```
node script/gettests.js
```

```
node script/difftests.js
```

## 進捗

* とりあえず諸事情で一部使う必要があったので、460のリンクテストだけ先に追加した。

## 今後について

ブラウザ用、Node.js用の出力ができるようにしていきたい。
