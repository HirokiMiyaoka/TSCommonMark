"use strict";
var TSCommonMark;
(function (TSCommonMark) {
    let CommonMarkTypes;
    (function (CommonMarkTypes) {
        CommonMarkTypes[CommonMarkTypes["NONE"] = 0] = "NONE";
        CommonMarkTypes[CommonMarkTypes["HEADLINE"] = 1] = "HEADLINE";
        CommonMarkTypes[CommonMarkTypes["PARAGRAPH"] = 2] = "PARAGRAPH";
        CommonMarkTypes[CommonMarkTypes["ANCHOR"] = 3] = "ANCHOR";
        CommonMarkTypes[CommonMarkTypes["CODE"] = 4] = "CODE";
        CommonMarkTypes[CommonMarkTypes["ULIST"] = 5] = "ULIST";
        CommonMarkTypes[CommonMarkTypes["LINE"] = 6] = "LINE";
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
    TSCommonMark.LiteNodeBase = LiteNodeBase;
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
            this.attribute = {};
            this.newLineBegin = !!option.newLineBegin;
            this.newLine = !option.oneLine;
        }
        appendChild(children) {
            if (Array.isArray(children)) {
                children.forEach((child) => { this.childlen.push(child); });
            }
            else {
                this.childlen.push(children);
            }
        }
        setAttribute(key, value) {
            this.attribute[key] = value;
        }
        toString() {
            if (!this.tag) {
                return this.toStringChildren();
            }
            if (!this.close) {
                return '<' + this.tag + ' />' + (this.newLine ? '\n' : '');
            }
            return '<' + this.tag + this.toStringAttribute() + '>' + (this.newLineBegin ? '\n' : '') + this.toStringChildren() + '</' + this.tag + '>' + (this.newLine ? '\n' : '');
        }
        toStringAttribute() {
            const keys = Object.keys(this.attribute);
            if (keys.length <= 0) {
                return '';
            }
            return ' ' + keys.map((key) => {
                return key + '="' + (this.attribute[key] || '').replace(/\"/g, '&quot;') + '"';
            }).join(' ');
        }
        toStringChildren() {
            return this.childlen.map((child) => { return child.toString(); }).join('');
        }
        toDOM(node) {
            const root = node || document.createElement(this.tag || 'div');
            Object.keys(this.attribute).forEach((key) => {
                if (key === 'class') {
                    root.classList.add(...this.attribute.class.split(' '));
                }
                else {
                    root[key] = this.attribute[key];
                }
            });
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
        toDOM(node) { return this.root.toDOM(node); }
        toString() {
            return this.root.toString();
        }
        parse(source) {
            this.initStack();
            let type = CommonMarkTypes.NONE;
            const lines = source.split('\n');
            lines.forEach((line) => {
                const ltype = this.lineType(line);
                if (ltype === CommonMarkTypes.NONE) {
                    if (type === CommonMarkTypes.PARAGRAPH) {
                        type = CommonMarkTypes.NONE;
                    }
                }
                else if (ltype === CommonMarkTypes.LINE) {
                    type = CommonMarkTypes.NONE;
                }
                else if (type === CommonMarkTypes.PARAGRAPH) {
                    this.addParagraph(type, line);
                    type = ltype;
                    return;
                }
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
                        this.addCodeBlock(type, line);
                        type = ltype;
                        break;
                    case CommonMarkTypes.PARAGRAPH:
                        this.addParagraph(type, line);
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
        lineType(line) {
            if (line.match(/^\#{1,6}\s+/)) {
                return CommonMarkTypes.HEADLINE;
            }
            if (line.match(/^ {0,3}(\*\s*\*\s*\*[\s\*]*|\-\s*\-\s*\-[\s\-]*|\_\s*\_\s*\_[\s\_]*)$/)) {
                return CommonMarkTypes.LINE;
            }
            if (line.match(/^ {0,3}\- /)) {
                return CommonMarkTypes.ULIST;
            }
            if (line.match(/^\>{0,1}(\t|    | {1,3}\t)/)) {
                return CommonMarkTypes.CODE;
            }
            if (!line) {
                return CommonMarkTypes.NONE;
            }
            return CommonMarkTypes.PARAGRAPH;
        }
        parseInline(line) {
            const nodes = [];
            let data = this.margeInlineNodes(nodes, this.parseEmphasis(line), false);
            data = this.margeInlineNodes(nodes, this.parseAnchor(data.next || ''), false);
            if (data.next) {
                nodes.push(new LiteTextNode(data.next));
            }
            return nodes;
        }
        margeInlineNodes(nodes, data, recrusion) {
            if (data.prev) {
                if (recrusion) {
                    const pdata = this.parseInline(data.prev);
                    nodes.push(...pdata);
                }
                else {
                    nodes.push(new LiteTextNode(data.prev));
                }
                delete data.prev;
            }
            if (data.node) {
                nodes.push(data.node);
                delete data.node;
            }
            return data;
        }
        parseEmphasis(line) {
            const r = /\*([^\*]+?)\*/g;
            const match = r.exec(line);
            if (!match) {
                return { next: line };
            }
            const data = {};
            if (match.index) {
                data.prev = line.substr(0, match.index);
            }
            if (r.lastIndex < line.length) {
                data.next = line.substr(r.lastIndex);
            }
            data.node = new LiteNode('em', { oneLine: true });
            data.node.appendChild(new LiteTextNode(match[1] || ''));
            return data;
        }
        parseAnchor(line) {
            const r = /\[(.+?)\]\((.*?)\)/g;
            const match = r.exec(line);
            if (!match) {
                return { next: line };
            }
            const data = {};
            if (match.index) {
                data.prev = line.substr(0, match.index);
            }
            if (r.lastIndex < line.length) {
                data.next = line.substr(r.lastIndex);
            }
            data.node = new LiteNode('a', { oneLine: true });
            data.node.setAttribute('href', match[2] || '');
            data.node.appendChild(new LiteTextNode(match[1] || ''));
            return data;
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
        addParagraph(now, line) {
            line = line.replace(/^\s+/, '');
            if (!line) {
                return;
            }
            if (now !== CommonMarkTypes.PARAGRAPH) {
                this.initStack();
                const root = new LiteNode('p');
                this.lastStack().appendChild(root);
                this.stack.push(root);
            }
            else {
                line = '\n' + line;
            }
            const proot = this.lastStack();
            proot.appendChild(this.parseInline(line));
        }
        addCodeBlock(now, line) {
            let softtab = !!line.match(/^\>/);
            line += '\n';
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
    }
    TSCommonMark.CommonMark = CommonMark;
    function parse2String(source) {
        return new CommonMark().parse(source).toString();
    }
    TSCommonMark.parse2String = parse2String;
    function parseLine2String(line) {
        const list = new CommonMark().parseInline(line);
        return list.map((child) => { return child.toString(); }).join('');
    }
    TSCommonMark.parseLine2String = parseLine2String;
    function parse2DOMTree(source, node) {
        return new CommonMark().parse(source).toDOM(node);
    }
    TSCommonMark.parse2DOMTree = parse2DOMTree;
    function parseLine2DOMTree(line, node) {
        const root = node || document.createElement('p');
        new CommonMark().parseInline(line).forEach((child) => {
            root.appendChild(child.toDOM());
        });
        return root;
    }
    TSCommonMark.parseLine2DOMTree = parseLine2DOMTree;
})(TSCommonMark || (TSCommonMark = {}));
module.exports = TSCommonMark;
