"use strict";
var TSCommonMark;
(function (TSCommonMark) {
    let CommonMarkTypes;
    (function (CommonMarkTypes) {
        CommonMarkTypes[CommonMarkTypes["NONE"] = 0] = "NONE";
        CommonMarkTypes[CommonMarkTypes["HEADLINE"] = 1] = "HEADLINE";
        CommonMarkTypes[CommonMarkTypes["PARAGRAPH"] = 2] = "PARAGRAPH";
        CommonMarkTypes[CommonMarkTypes["CODE"] = 3] = "CODE";
        CommonMarkTypes[CommonMarkTypes["ULIST"] = 4] = "ULIST";
        CommonMarkTypes[CommonMarkTypes["LINE"] = 5] = "LINE";
    })(CommonMarkTypes || (CommonMarkTypes = {}));
    ;
    class LiteNodeBase {
        constructor(tag, option = {}) {
            this.tag = tag;
            this.close = true;
            switch (tag) {
                case 'br':
                case 'hr':
                    this.close = false;
                    break;
            }
        }
        toString() {
            return this.close ? '<' + this.tag + ' />' : ['<', '></', '>'].join(this.tag);
        }
        toDOM() { return document.createElement(this.tag); }
    }
    class LiteTextNode extends LiteNodeBase {
        constructor(text, option = {}) {
            super('text', option);
            this.text = text;
        }
        toString() { return this.text; }
        toDOM() { return document.createTextNode(this.text); }
    }
    class LiteNode extends LiteNodeBase {
        constructor(tag = '', option = {}) {
            super(tag, option);
            this.childlen = [];
            this.newLineBegin = !!option.newLineBegin;
            this.newLine = !option.oneLine;
        }
        appendChild(child) {
            this.childlen.push(child);
        }
        toString() {
            if (!this.tag) {
                return this.toStringChildren();
            }
            if (!this.close) {
                return '<' + this.tag + ' />' + (this.newLine ? '\n' : '');
            }
            return '<' + this.tag + '>' + (this.newLineBegin ? '\n' : '') + this.toStringChildren() + '</' + this.tag + '>' + (this.newLine ? '\n' : '');
        }
        toStringChildren() {
            return this.childlen.map((child) => { return child.toString(); }).join('');
        }
        toDOM() {
            const root = document.createElement(this.tag || 'div');
            this.childlen.forEach((child) => {
                root.appendChild(child.toDOM());
            });
            return root;
        }
    }
    class CommonMark {
        constructor() {
            this.root = new LiteNode();
        }
        toDOM() { return this.root.toDOM(); }
        toString() {
            return this.root.toString();
        }
        parse(source) {
            this.initStack();
            let type = CommonMarkTypes.NONE;
            const lines = source.split('\n');
            lines.forEach((line) => {
                const ltype = this.lineType(line);
                switch (ltype) {
                    case CommonMarkTypes.HEADLINE:
                        this.addHeadline(type, line);
                        type = CommonMarkTypes.NONE;
                        break;
                    case CommonMarkTypes.ULIST:
                        this.addUList(type, line);
                        type = ltype;
                        break;
                    case CommonMarkTypes.CODE:
                        this.addCodeBlock(type, line + '\n');
                        type = ltype;
                        break;
                    case CommonMarkTypes.LINE:
                        this.addLine(type, line);
                        type = CommonMarkTypes.NONE;
                        break;
                }
            });
            return this;
        }
        addHeadline(now, line) {
            this.initStack();
            const [lv, title] = line.split(/\s+/, 2);
            const root = new LiteNode('h' + lv.length);
            root.appendChild(new LiteTextNode(title));
            this.lastStack().appendChild(root);
            this.stack.push(root);
        }
        addUList(now, line) {
            if (now !== CommonMarkTypes.ULIST) {
                this.popStack();
                const root = new LiteNode('ul', { newLineBegin: true });
                this.lastStack().appendChild(root);
                this.stack.push(root);
            }
            const item = new LiteNode('li');
            item.appendChild(new LiteTextNode(line.split('- ', 2)[1]));
            this.lastStack().appendChild(item);
        }
        addCodeBlock(now, line) {
            let softtab = !!line.match(/^\>/);
            if (now !== CommonMarkTypes.CODE) {
                this.popStack();
                let root = new LiteNode('pre');
                const coderoot = new LiteNode('code', { oneLine: true });
                root.appendChild(coderoot);
                if (line.match(/^\>/)) {
                    const r = new LiteNode('blockquote', { newLineBegin: true });
                    r.appendChild(root);
                    root = r;
                }
                this.lastStack().appendChild(root);
                this.stack.push(coderoot);
            }
            line = line.replace(/^\>{0,1}(\t|    | {1,3}\t)/, '');
            if (softtab) {
                line = line.replace('\t', '  ');
            }
            const coderoot = this.stack[this.stack.length - 1];
            coderoot.appendChild(new LiteTextNode(line));
        }
        addLine(now, line) {
            this.initStack();
            const [lv, title] = line.split(/\s+/, 2);
            const root = new LiteNode('hr');
            this.lastStack().appendChild(root);
            this.stack.push(root);
        }
        popStack() {
            if (this.stack.length <= 1) {
                return;
            }
            this.stack.pop();
        }
        initStack() {
            this.stack = [this.root];
        }
        lastStack() {
            return this.stack[this.stack.length - 1];
        }
        lineType(line) {
            if (line.match(/^\#{1,6}\s+/)) {
                return CommonMarkTypes.HEADLINE;
            }
            if (line.match(/^ {0,3}\- /)) {
                return CommonMarkTypes.ULIST;
            }
            if (line.match(/^\>{0,1}(\t|    | {1,3}\t)/)) {
                return CommonMarkTypes.CODE;
            }
            if (line.match(/^\s{0,3}(\*\*\*|\-\-\-|\_\_\_)\s*$/)) {
                return CommonMarkTypes.LINE;
            }
            return CommonMarkTypes.NONE;
        }
    }
    TSCommonMark.CommonMark = CommonMark;
    function parse2String(source) {
        return new CommonMark().parse(source).toString();
    }
    TSCommonMark.parse2String = parse2String;
    function parse2DOMTree(source) {
        return new CommonMark().parse(source).toDOM();
    }
    TSCommonMark.parse2DOMTree = parse2DOMTree;
})(TSCommonMark || (TSCommonMark = {}));
module.exports = TSCommonMark;
