var TSCommonMark;
(function (TSCommonMark) {
    var CommonMarkTypes;
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
    var TagTable = (_a = {},
        _a[CommonMarkTypes.HEADLINE1] = 'h1',
        _a[CommonMarkTypes.HEADLINE2] = 'h2',
        _a[CommonMarkTypes.HEADLINE3] = 'h3',
        _a[CommonMarkTypes.HEADLINE4] = 'h4',
        _a[CommonMarkTypes.HEADLINE5] = 'h5',
        _a[CommonMarkTypes.HEADLINE6] = 'h6',
        _a[CommonMarkTypes.PARAGRAPH] = 'p',
        _a[CommonMarkTypes.ULIST] = 'ul',
        _a[CommonMarkTypes.HORIZON] = 'hr',
        _a);
    var LiteTextNode = (function () {
        function LiteTextNode(text) {
            this.text = text;
        }
        LiteTextNode.prototype.toString = function () { return this.text; };
        LiteTextNode.prototype.toDOM = function () { return document.createTextNode(this.text); };
        return LiteTextNode;
    }());
    var LiteNode = (function () {
        function LiteNode(tag, option) {
            if (tag === void 0) { tag = ''; }
            if (option === void 0) { option = {}; }
            this.childlen = [];
            this.attribute = {};
            this.changeTag(tag);
            this.newLineBegin = false;
            this.newLine = true;
            this.changeOption(option);
        }
        LiteNode.prototype.changeOption = function (option) {
            if (option === void 0) { option = {}; }
            if (option.newLineBegin !== undefined) {
                this.newLineBegin = !!option.newLineBegin;
            }
            if (option.oneLine !== undefined) {
                this.newLine = !option.oneLine;
            }
        };
        LiteNode.prototype.getTag = function () { return this.tag; };
        LiteNode.prototype.changeTag = function (tag) {
            this.tag = tag;
            this.close = true;
            switch (tag) {
                case 'br':
                case 'hr':
                    this.close = false;
                    break;
            }
        };
        LiteNode.prototype.appendChild = function (children) {
            var _this = this;
            if (Array.isArray(children)) {
                children.forEach(function (child) { _this.childlen.push(child); });
            }
            else {
                this.childlen.push(children);
            }
        };
        LiteNode.prototype.setAttribute = function (key, value) {
            this.attribute[key] = value;
        };
        LiteNode.prototype.toString = function () {
            if (!this.tag) {
                return this.toStringChildren();
            }
            if (!this.close) {
                return '<' + this.tag + ' />' + (this.newLine ? '\n' : '');
            }
            return '<' + this.tag + this.toStringAttribute() + '>' + (this.newLineBegin ? '\n' : '') + this.toStringChildren() + '</' + this.tag + '>' + (this.newLine ? '\n' : '');
        };
        LiteNode.prototype.toStringAttribute = function () {
            var _this = this;
            var keys = Object.keys(this.attribute);
            if (keys.length <= 0) {
                return '';
            }
            return ' ' + keys.map(function (key) {
                return key + '="' + (_this.attribute[key] || '').replace(/\"/g, '&quot;') + '"';
            }).join(' ');
        };
        LiteNode.prototype.toStringChildren = function () {
            return this.childlen.map(function (child) { return child.toString(); }).join('');
        };
        LiteNode.prototype.toDOM = function (node) {
            var _this = this;
            var root = node || document.createElement(this.tag || 'div');
            Object.keys(this.attribute).forEach(function (key) {
                if (key === 'class') {
                    (_a = root.classList).add.apply(_a, _this.attribute.class.split(' '));
                }
                else {
                    root[key] = _this.attribute[key];
                }
                var _a;
            });
            this.childlen.forEach(function (child) {
                root.appendChild(child.toDOM());
            });
            return root;
        };
        return LiteNode;
    }());
    function isTextNode(node) {
        return node.getTag === undefined;
    }
    var CommonMark = (function () {
        function CommonMark() {
            this.root = new LiteNode();
        }
        CommonMark.prototype.toDOM = function (node) { return this.root.toDOM(node); };
        CommonMark.prototype.toString = function () {
            return this.root.toString();
        };
        CommonMark.prototype.parse = function (source) {
            var lines = source.split('\n');
            while (0 < lines.length) {
                var isLastList = this.checkLastNode('ul');
                var block = new CommonMarkBlock().parse(lines, isLastList);
                if (!block) {
                    continue;
                }
                if (isLastList && (block.getTag() === 'pre' || block.getTag() === 'p')) {
                    var li = this.lastNode(this.lastNode());
                    if (li.childlen.length === 1 && isTextNode(li.childlen[0])) {
                        li.changeOption({ newLineBegin: true });
                        var p = new LiteNode('p');
                        p.appendChild(li.childlen[0]);
                        li.childlen[0] = p;
                    }
                    li.appendChild(block);
                    continue;
                }
                this.root.appendChild(block);
            }
            return this;
        };
        CommonMark.prototype.checkLastNode = function (tag) {
            var last = this.lastNode();
            if (!last) {
                return false;
            }
            return last.getTag() === tag;
        };
        CommonMark.prototype.lastNode = function (node) {
            if (node === void 0) { node = this.root; }
            return node.childlen[this.root.childlen.length - 1];
        };
        CommonMark.prototype.innermostNode = function (node, tag) {
            var result = this._innermostNode(node, tag);
            if (result === null) {
                return node;
            }
            return result;
        };
        CommonMark.prototype._innermostNode = function (node, tag) {
            if (!node || isTextNode(node)) {
                return null;
            }
            if (node.getTag() === tag) {
                var last = this._innermostNode(this.lastNode(node), tag) || node;
                return node;
            }
            else {
                if (node.childlen.length <= 0) {
                    return node;
                }
            }
            return this._innermostNode(this.lastNode(node), tag);
        };
        return CommonMark;
    }());
    TSCommonMark.CommonMark = CommonMark;
    var CommonMarkBlock = (function () {
        function CommonMarkBlock() {
            this.root = new LiteNode();
        }
        CommonMarkBlock.prototype.parse = function (lines, beforeList) {
            if (lines.length <= 0) {
                return null;
            }
            var line = lines.shift();
            var result = this.lineParser(line, beforeList);
            if (result.type === CommonMarkTypes.NONE) {
                return null;
            }
            var root = this.changeRoot(result.type);
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
                        var pre = new LiteNode('pre');
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
        };
        CommonMarkBlock.prototype.lineParser = function (line, beforeList) {
            if (!line) {
                return { type: CommonMarkTypes.NONE };
            }
            var result;
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
        };
        CommonMarkBlock.prototype.specialHeadline = function (lines) {
            if (lines.length <= 0) {
                return false;
            }
            var line = lines.shift();
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
        };
        CommonMarkBlock.prototype.changeRoot = function (type) {
            if (TagTable[type]) {
                this.root.changeTag(TagTable[type]);
                return this.root;
            }
            return this.root;
        };
        CommonMarkBlock.prototype.parseInline = function (line) {
            return new CommonMarkInline().parseInline(line);
        };
        CommonMarkBlock.prototype.loopParagraph = function (lines) {
            while (0 < lines.length) {
                var line = lines.shift();
                var result = this.lineParser(line);
                switch (result.type) {
                    case CommonMarkTypes.NONE:
                        return;
                    case CommonMarkTypes.HORIZON:
                        lines.unshift(line);
                        return;
                }
                this.root.appendChild(this.parseInline('\n' + line.replace(/^[ \t]+/, '')));
            }
        };
        CommonMarkBlock.prototype.loopCodeBlock = function (lines, first) {
            var code = new LiteNode('code', { oneLine: true });
            code.appendChild(new LiteTextNode(first + '\n'));
            while (0 < lines.length) {
                var line = lines.shift();
                var result = this.lineParser(line);
                switch (result.type) {
                    case CommonMarkTypes.NONE:
                        return code;
                }
                code.appendChild(new LiteTextNode(result.line + '\n'));
            }
            return code;
        };
        CommonMarkBlock.prototype.loopList = function (lines) {
            while (0 < lines.length) {
                var line = lines.shift();
                var result = this.lineParser(line);
                switch (result.type) {
                    case CommonMarkTypes.NONE:
                        return;
                    case CommonMarkTypes.HORIZON:
                        lines.unshift(line);
                        return;
                }
                this.root.appendChild(this.createListItem(typeof result.option === 'string' ? result.option : ''));
            }
        };
        CommonMarkBlock.prototype.createListItem = function (line) {
            var li = new LiteNode('li');
            var result = this.lineParser(line);
            if (result.type === CommonMarkTypes.PARAGRAPH) {
                li.appendChild(new CommonMarkInline().parseInline(line.replace(/^[ \t]/, '')));
                return li;
            }
            if (result.type === CommonMarkTypes.CODE) {
                var pre = new LiteNode('pre');
                pre.appendChild(this.loopCodeBlock([], result.line || ''));
                li.appendChild(pre);
                li.changeOption({ newLineBegin: true });
            }
            return li;
        };
        return CommonMarkBlock;
    }());
    var CommonMarkInline = (function () {
        function CommonMarkInline() {
        }
        CommonMarkInline.prototype.parse = function (line) {
            var _this = this;
            var nodes = this.parseInline(line);
            return {
                toString: function () { return _this.toString(nodes); },
                toDOM: function (node) { return _this.toDOM(nodes, node); },
            };
        };
        CommonMarkInline.prototype.toString = function (nodes) {
            return nodes.map(function (child) { return child.toString(); }).join('');
        };
        CommonMarkInline.prototype.toDOM = function (nodes, node) {
            var root = node || document.createElement('p');
            nodes.forEach(function (child) {
                root.appendChild(child.toDOM());
            });
            return root;
        };
        CommonMarkInline.prototype.parseInline = function (line) {
            var nodes = [];
            var data = this.margeInlineNodes(nodes, this.parseEmphasis(line), false);
            data = this.margeInlineNodes(nodes, this.parseAnchor(data.next || ''), false);
            if (data.next) {
                nodes.push(new LiteTextNode(data.next));
            }
            return nodes;
        };
        CommonMarkInline.prototype.margeInlineNodes = function (nodes, data, recrusion) {
            if (data.prev) {
                if (recrusion) {
                    var pdata = this.parseInline(data.prev);
                    nodes.push.apply(nodes, pdata);
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
        };
        CommonMarkInline.prototype.parseEmphasis = function (line) {
            var r = /\*([^\*]+?)\*/g;
            var match = r.exec(line);
            if (!match) {
                return { next: line };
            }
            var data = {};
            if (match.index) {
                data.prev = line.substr(0, match.index);
            }
            if (r.lastIndex < line.length) {
                data.next = line.substr(r.lastIndex);
            }
            data.node = new LiteNode('em', { oneLine: true });
            data.node.appendChild(new LiteTextNode(match[1] || ''));
            return data;
        };
        CommonMarkInline.prototype.parseAnchor = function (line) {
            var r = /\[(.+?)\]\((.*?)\)/g;
            var match = r.exec(line);
            if (!match) {
                return { next: line };
            }
            var data = {};
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
        };
        return CommonMarkInline;
    }());
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
        var root = node || document.createElement('p');
        return new CommonMarkInline().parse(line).toDOM(node);
    }
    TSCommonMark.parseLine2DOMTree = parseLine2DOMTree;
    var _a;
})(TSCommonMark || (TSCommonMark = {}));
var cmarked = {
    toString: function (md) { return TSCommonMark.parse2String(md); },
    toDOM: function (md) { return TSCommonMark.parse2DOMTree(md); },
};
