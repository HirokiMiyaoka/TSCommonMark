var TSCommonMark;
(function (TSCommonMark) {
    let CommonMarkTypes;
    (function (CommonMarkTypes) {
        CommonMarkTypes[CommonMarkTypes["NONE"] = 0] = "NONE";
        CommonMarkTypes[CommonMarkTypes["HEADLINE"] = 1] = "HEADLINE";
        CommonMarkTypes[CommonMarkTypes["HEADLINE1"] = 2] = "HEADLINE1";
        CommonMarkTypes[CommonMarkTypes["HEADLINE2"] = 3] = "HEADLINE2";
        CommonMarkTypes[CommonMarkTypes["PARAGRAPH"] = 4] = "PARAGRAPH";
        CommonMarkTypes[CommonMarkTypes["ANCHOR"] = 5] = "ANCHOR";
        CommonMarkTypes[CommonMarkTypes["CODE"] = 6] = "CODE";
        CommonMarkTypes[CommonMarkTypes["ULIST"] = 7] = "ULIST";
        CommonMarkTypes[CommonMarkTypes["UITEM"] = 8] = "UITEM";
        CommonMarkTypes[CommonMarkTypes["HORIZON"] = 9] = "HORIZON";
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
        changeOption(option = {}) { }
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
            this.newLineBegin = false;
            this.newLine = true;
            this.changeOption(option);
        }
        changeOption(option = {}) {
            if (option.newLineBegin !== undefined) {
                this.newLineBegin = !!option.newLineBegin;
            }
            if (option.oneLine !== undefined) {
                this.newLine = !option.oneLine;
            }
        }
        getTag() { return this.tag; }
        changeTag(tag) { this.tag = tag; }
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
            const lines = source.split('\n');
            this.parseLines(lines);
            return this;
        }
        parseLines(lines) {
            let type = CommonMarkTypes.NONE;
            lines.forEach((line, index) => {
                const ltype = this.lineType(line, type);
                if (ltype === CommonMarkTypes.NONE) {
                    if (type === CommonMarkTypes.PARAGRAPH) {
                        type = CommonMarkTypes.NONE;
                    }
                }
                else if (ltype === CommonMarkTypes.HORIZON) {
                    type = CommonMarkTypes.NONE;
                }
                else if (ltype === CommonMarkTypes.HEADLINE1 || ltype === CommonMarkTypes.HEADLINE2) {
                    this.addHeadlineSP(type, line);
                    type = CommonMarkTypes.NONE;
                    return;
                }
                else if (type === CommonMarkTypes.PARAGRAPH) {
                    this.addParagraph(type, line);
                    type = ltype;
                    return;
                }
                type = this.addLine(ltype, type, line);
            });
        }
        addLine(ltype, type, line) {
            switch (ltype) {
                case CommonMarkTypes.HEADLINE:
                    this.addHeadline(type, line);
                    return CommonMarkTypes.NONE;
                case CommonMarkTypes.ULIST:
                    this.addUList(type, line);
                    this.addUListItem(type, line);
                    return ltype;
                case CommonMarkTypes.UITEM:
                    this.appendUListItem(type, line);
                    break;
                case CommonMarkTypes.CODE:
                    this.addCodeBlock(type, line);
                    return ltype;
                case CommonMarkTypes.PARAGRAPH:
                    this.addParagraph(type, line);
                    return ltype;
                case CommonMarkTypes.HORIZON:
                    this.addHorizon(type, line);
                    return CommonMarkTypes.NONE;
            }
            return type;
        }
        lineType(line, type) {
            if (this.inList() && line.match(/^\t/)) {
                return CommonMarkTypes.UITEM;
            }
            if (line.match(/^\#{1,6}\s+/)) {
                return CommonMarkTypes.HEADLINE;
            }
            if (type === CommonMarkTypes.PARAGRAPH) {
                if (line.match(/^\={2,}$/)) {
                    return CommonMarkTypes.HEADLINE1;
                }
                if (line.match(/^\-{2,}$/)) {
                    return CommonMarkTypes.HEADLINE2;
                }
            }
            if (line.match(/^ {0,3}(\*\s*\*\s*\*[\s\*]*|\-\s*\-\s*\-[\s\-]*|\_\s*\_\s*\_[\s\_]*)$/)) {
                return CommonMarkTypes.HORIZON;
            }
            if (line.match(/^ {0,3}[\-\*] /)) {
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
        lastNode(node = this.root) {
            return node.childlen[this.root.childlen.length - 1];
        }
        innermostNode(node, tag) {
            const result = this._innermostNode(node, tag);
            if (result === null) {
                return node;
            }
            return result;
        }
        _innermostNode(node, tag) {
            if (!node || node.childlen === undefined) {
                return null;
            }
            if (node.getTag() === tag) {
                const last = this._innermostNode(this.lastNode(node), tag) || node;
                return node;
            }
            else {
                if (node.childlen.length <= 0) {
                    return node;
                }
            }
            return this._innermostNode(this.lastNode(node), tag);
        }
        inList() {
            const last = this.lastNode();
            if (!last || last.getTag === undefined) {
                return false;
            }
            return last.getTag() === 'ul';
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
            const [lv, title] = line.split(/\s+/, 2);
            const root = new LiteNode('h' + lv.length);
            root.appendChild(new LiteTextNode(title));
            this.root.appendChild(root);
        }
        addHeadlineSP(now, line) {
            const last = this.lastNode();
            last.changeTag(now === CommonMarkTypes.HEADLINE1 ? 'h1' : 'h2');
        }
        addUList(now, line) {
            if (now === CommonMarkTypes.ULIST) {
                return;
            }
            const root = new LiteNode('ul', { newLineBegin: true });
            this.root.appendChild(root);
        }
        addUListItem(now, line) {
            const item = new LiteNode('li');
            item.appendChild(new LiteTextNode(line.split(/[\-\*] /, 2)[1]));
            this.innermostNode(this.lastNode(), 'ul').appendChild(item);
        }
        appendUListItem(now, line) {
            const lastli = this.innermostNode(this.lastNode(), 'li');
            if (lastli.childlen[lastli.childlen.length - 1].getTag === undefined) {
                const textnode = lastli.childlen[lastli.childlen.length - 1];
                const p = new LiteNode('p', { oneLine: false });
                p.appendChild(textnode);
                lastli.childlen[lastli.childlen.length - 1] = p;
                lastli.changeOption({ newLineBegin: true, oneLine: false });
            }
            line = line.replace(/^\t/, '');
            const p = new LiteNode('p', { oneLine: false });
            p.appendChild(new LiteTextNode(line));
            lastli.appendChild(p);
        }
        addParagraph(now, line) {
            line = line.replace(/^\s+/, '');
            if (!line) {
                return;
            }
            if (now !== CommonMarkTypes.PARAGRAPH) {
                const root = new LiteNode('p');
                this.root.appendChild(root);
            }
            else {
                line = '\n' + line;
            }
            const proot = this.lastNode();
            proot.appendChild(this.parseInline(line));
        }
        addCodeBlock(now, line) {
            let softtab = !!line.match(/^\>/);
            line += '\n';
            if (now !== CommonMarkTypes.CODE) {
                let root = new LiteNode('pre');
                const coderoot = new LiteNode('code', { oneLine: true });
                root.appendChild(coderoot);
                if (line.match(/^\>/)) {
                    const r = new LiteNode('blockquote', { newLineBegin: true });
                    r.appendChild(root);
                    root = r;
                }
                this.root.appendChild(root);
            }
            line = line.replace(/^\>{0,1}(\t|    | {1,3}\t)/, '');
            if (softtab) {
                line = line.replace('\t', '  ');
            }
            const coderoot = this.innermostNode(this.lastNode(), 'code');
            coderoot.appendChild(new LiteTextNode(line));
        }
        addHorizon(now, line) {
            const root = new LiteNode('hr');
            this.root.appendChild(root);
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
