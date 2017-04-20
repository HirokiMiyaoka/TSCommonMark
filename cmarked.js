"use strict";
var CommonMarkTypes;
(function (CommonMarkTypes) {
    CommonMarkTypes[CommonMarkTypes["NONE"] = 0] = "NONE";
    CommonMarkTypes[CommonMarkTypes["PARAGRAPH"] = 1] = "PARAGRAPH";
    CommonMarkTypes[CommonMarkTypes["CODE"] = 2] = "CODE";
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
        this.stack = [this.root];
        let type = CommonMarkTypes.NONE;
        const lines = source.split('\n');
        lines.forEach((line) => {
            const ltype = this.lineType(line);
            switch (ltype) {
                case CommonMarkTypes.CODE:
                    this.addCodeBlock(type, line + '\n');
                    type = ltype;
                    break;
            }
        });
        return this;
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
    popStack() {
        if (this.stack.length <= 1) {
            return;
        }
        this.stack.pop();
    }
    lastStack() {
        return this.stack[this.stack.length - 1];
    }
    lineType(line) {
        if (line.match(/^\>{0,1}(\t|    | {1,}\t)/)) {
            return CommonMarkTypes.CODE;
        }
        return CommonMarkTypes.NONE;
    }
    static parse2String(source) {
        return new CommonMark().parse(source).toString();
    }
    static parse2DOMTree(source) {
        return new CommonMark().parse(source).toDOM();
    }
}
function cmarked(source) { return CommonMark.parse2String(source); }
module.exports = cmarked;
