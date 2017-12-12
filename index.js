var TSCommonMark;
(function (TSCommonMark) {
    let CommonMarkTypes;
    (function (CommonMarkTypes) {
        CommonMarkTypes[CommonMarkTypes["NONE"] = 0] = "NONE";
        CommonMarkTypes[CommonMarkTypes["HEADLINE"] = 1] = "HEADLINE";
        CommonMarkTypes[CommonMarkTypes["HEADLINE1"] = 2] = "HEADLINE1";
        CommonMarkTypes[CommonMarkTypes["HEADLINE2"] = 3] = "HEADLINE2";
        CommonMarkTypes[CommonMarkTypes["HEADLINE3"] = 4] = "HEADLINE3";
        CommonMarkTypes[CommonMarkTypes["HEADLINE4"] = 5] = "HEADLINE4";
        CommonMarkTypes[CommonMarkTypes["HEADLINE5"] = 6] = "HEADLINE5";
        CommonMarkTypes[CommonMarkTypes["HEADLINE6"] = 7] = "HEADLINE6";
        CommonMarkTypes[CommonMarkTypes["PARAGRAPH"] = 8] = "PARAGRAPH";
        CommonMarkTypes[CommonMarkTypes["ANCHOR"] = 9] = "ANCHOR";
        CommonMarkTypes[CommonMarkTypes["CODE"] = 10] = "CODE";
        CommonMarkTypes[CommonMarkTypes["ULIST"] = 11] = "ULIST";
        CommonMarkTypes[CommonMarkTypes["UITEM"] = 12] = "UITEM";
        CommonMarkTypes[CommonMarkTypes["HORIZON"] = 13] = "HORIZON";
    })(CommonMarkTypes || (CommonMarkTypes = {}));
    ;
    const TagTable = {
        [CommonMarkTypes.HEADLINE1]: 'h1',
        [CommonMarkTypes.HEADLINE2]: 'h2',
        [CommonMarkTypes.HEADLINE3]: 'h3',
        [CommonMarkTypes.HEADLINE4]: 'h4',
        [CommonMarkTypes.HEADLINE5]: 'h5',
        [CommonMarkTypes.HEADLINE6]: 'h6',
        [CommonMarkTypes.PARAGRAPH]: 'p',
        [CommonMarkTypes.ULIST]: 'ul',
        [CommonMarkTypes.HORIZON]: 'hr',
    };
    class LiteTextNode {
        constructor(text) {
            this.text = text;
        }
        toString() { return this.text; }
        toDOM() { return document.createTextNode(this.text); }
    }
    class LiteNode {
        constructor(tag = '', option = {}) {
            this.childlen = [];
            this.attribute = {};
            this.changeTag(tag);
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
        changeTag(tag) {
            this.tag = tag;
            this.close = true;
            switch (tag) {
                case 'br':
                case 'hr':
                    this.close = false;
                    break;
            }
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
    function isTextNode(node) {
        return node.getTag === undefined;
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
            while (0 < lines.length) {
                const isLastList = this.checkLastNode('ul');
                const block = new CommonMarkBlock().parse(lines, isLastList);
                if (!block) {
                    continue;
                }
                if (isLastList && (block.getTag() === 'pre' || block.getTag() === 'p')) {
                    const li = this.lastNode(this.lastNode());
                    if (li.childlen.length === 1 && isTextNode(li.childlen[0])) {
                        li.changeOption({ newLineBegin: true });
                        const p = new LiteNode('p');
                        p.appendChild(li.childlen[0]);
                        li.childlen[0] = p;
                    }
                    li.appendChild(block);
                    continue;
                }
                this.root.appendChild(block);
            }
            return this;
        }
        checkLastNode(tag) {
            const last = this.lastNode();
            if (!last) {
                return false;
            }
            return last.getTag() === tag;
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
            if (!node || isTextNode(node)) {
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
    }
    TSCommonMark.CommonMark = CommonMark;
    class CommonMarkBlock {
        constructor() {
            this.root = new LiteNode();
        }
        parse(lines, beforeList) {
            if (lines.length <= 0) {
                return null;
            }
            const line = lines.shift();
            const result = this.lineParser(line, beforeList);
            if (result.type === CommonMarkTypes.NONE) {
                return null;
            }
            const root = this.changeRoot(result.type);
            switch (result.type) {
                case CommonMarkTypes.HORIZON:
                    return this.root;
            }
            if (result.line && result.type !== CommonMarkTypes.CODE) {
                this.root.appendChild(this.parseInline(result.line.replace(/^[ \t]+/, '')));
            }
            switch (result.type) {
                case CommonMarkTypes.HEADLINE1:
                case CommonMarkTypes.HEADLINE2:
                case CommonMarkTypes.HEADLINE3:
                case CommonMarkTypes.HEADLINE4:
                case CommonMarkTypes.HEADLINE5:
                case CommonMarkTypes.HEADLINE6:
                    return this.root;
            }
            switch (result.type) {
                case CommonMarkTypes.PARAGRAPH:
                    if (this.specialHeadline(lines)) {
                        return this.root;
                    }
                    if (result.option) {
                        return this.root;
                    }
                    this.loopParagraph(lines);
                    break;
                case CommonMarkTypes.CODE:
                    if (result.option) {
                        this.root.changeTag('blockquote');
                        this.root.changeOption({ newLineBegin: true });
                        const pre = new LiteNode('pre');
                        pre.appendChild(this.loopCodeBlock(lines, result.line));
                        this.root.appendChild(pre);
                    }
                    else {
                        this.root.changeTag('pre');
                        this.root.appendChild(this.loopCodeBlock(lines, result.line));
                    }
                    break;
                case CommonMarkTypes.ULIST:
                    this.root.changeOption({ newLineBegin: true });
                    this.root.appendChild(this.createListItem(result.option));
                    this.loopList(lines);
                    break;
            }
            return this.root;
        }
        lineParser(line, beforeList) {
            if (!line) {
                return { type: CommonMarkTypes.NONE };
            }
            let result;
            if ((result = line.match(/^(\#{1,6})\s+(.*)$/))) {
                return { type: CommonMarkTypes.HEADLINE + result[1].length, line: result[2] };
            }
            if (line.match(/^ {0,3}(\*\s*\*\s*\*[\s\*]*|\-\s*\-\s*\-[\s\-]*|\_\s*\_\s*\_[\s\_]*)$/)) {
                return { type: CommonMarkTypes.HORIZON };
            }
            if ((result = line.match(/^ {0,3}[\-\*]([ \t].*)/))) {
                return { type: CommonMarkTypes.ULIST, option: result[1] };
            }
            if (beforeList && (result = line.match(/^\t([^\s]+)/))) {
                return { type: CommonMarkTypes.PARAGRAPH, line: result[1], option: true };
            }
            if ((result = line.match(/^(\>{0,1})(\t|    | {1,3}\t)(.+)/))) {
                return { type: CommonMarkTypes.CODE, line: result[3].replace(/^\t/, '  '), option: !!result[1] };
            }
            return { type: CommonMarkTypes.PARAGRAPH, line: line };
        }
        specialHeadline(lines) {
            if (lines.length <= 0) {
                return false;
            }
            const line = lines.shift();
            if (line.match(/^\={2,}$/)) {
                this.changeRoot(CommonMarkTypes.HEADLINE1);
                return true;
            }
            if (line.match(/^\-{2,}$/)) {
                this.changeRoot(CommonMarkTypes.HEADLINE2);
                return true;
            }
            lines.unshift(line);
            return false;
        }
        changeRoot(type) {
            if (TagTable[type]) {
                this.root.changeTag(TagTable[type]);
                return this.root;
            }
            return this.root;
        }
        parseInline(line) {
            return new CommonMarkInline().parseInline(line);
        }
        loopParagraph(lines) {
            while (0 < lines.length) {
                const line = lines.shift();
                const result = this.lineParser(line);
                switch (result.type) {
                    case CommonMarkTypes.NONE:
                        return;
                    case CommonMarkTypes.HORIZON:
                        lines.unshift(line);
                        return;
                }
                this.root.appendChild(this.parseInline('\n' + line.replace(/^[ \t]+/, '')));
            }
        }
        loopCodeBlock(lines, first) {
            const code = new LiteNode('code', { oneLine: true });
            code.appendChild(new LiteTextNode(first + '\n'));
            while (0 < lines.length) {
                const line = lines.shift();
                const result = this.lineParser(line);
                switch (result.type) {
                    case CommonMarkTypes.NONE:
                        return code;
                }
                code.appendChild(new LiteTextNode(result.line + '\n'));
            }
            return code;
        }
        loopList(lines) {
            while (0 < lines.length) {
                const line = lines.shift();
                const result = this.lineParser(line);
                switch (result.type) {
                    case CommonMarkTypes.NONE:
                        return;
                    case CommonMarkTypes.HORIZON:
                        lines.unshift(line);
                        return;
                }
                this.root.appendChild(this.createListItem(typeof result.option === 'string' ? result.option : ''));
            }
        }
        createListItem(line) {
            const li = new LiteNode('li');
            const result = this.lineParser(line);
            if (result.type === CommonMarkTypes.PARAGRAPH) {
                li.appendChild(new CommonMarkInline().parseInline(line.replace(/^[ \t]/, '')));
                return li;
            }
            if (result.type === CommonMarkTypes.CODE) {
                const pre = new LiteNode('pre');
                pre.appendChild(this.loopCodeBlock([], result.line || ''));
                li.appendChild(pre);
                li.changeOption({ newLineBegin: true });
            }
            return li;
        }
    }
    class CommonMarkInline {
        constructor() { }
        parse(line) {
            const nodes = this.parseInline(line);
            return {
                toString: () => { return this.toString(nodes); },
                toDOM: (node) => { return this.toDOM(nodes, node); },
            };
        }
        toString(nodes) {
            return nodes.map((child) => { return child.toString(); }).join('');
        }
        toDOM(nodes, node) {
            const root = node || document.createElement('p');
            nodes.forEach((child) => {
                root.appendChild(child.toDOM());
            });
            return root;
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
    }
    function parse2String(source) {
        return new CommonMark().parse(source).toString();
    }
    TSCommonMark.parse2String = parse2String;
    function parseLine2String(line) {
        return new CommonMarkInline().parse(line).toString();
    }
    TSCommonMark.parseLine2String = parseLine2String;
    function parse2DOMTree(source, node) {
        return new CommonMark().parse(source).toDOM(node);
    }
    TSCommonMark.parse2DOMTree = parse2DOMTree;
    function parseLine2DOMTree(line, node) {
        const root = node || document.createElement('p');
        return new CommonMarkInline().parse(line).toDOM(node);
    }
    TSCommonMark.parseLine2DOMTree = parseLine2DOMTree;
})(TSCommonMark || (TSCommonMark = {}));
module.exports = TSCommonMark;
