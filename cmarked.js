var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var TSCommonMark;
(function (TSCommonMark) {
    var CommonMarkTypes;
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
    var LiteNodeBase = (function () {
        function LiteNodeBase(tag, option) {
            if (option === void 0) { option = {}; }
            this.tag = tag;
            this.close = true;
            switch (tag) {
                case 'br':
                case 'hr':
                    this.close = false;
                    break;
            }
        }
        LiteNodeBase.prototype.changeOption = function (option) {
            if (option === void 0) { option = {}; }
        };
        LiteNodeBase.prototype.toString = function () {
            return this.close ? '<' + this.tag + ' />' : ['<', '></', '>'].join(this.tag);
        };
        LiteNodeBase.prototype.toDOM = function () { return document.createElement(this.tag); };
        return LiteNodeBase;
    }());
    TSCommonMark.LiteNodeBase = LiteNodeBase;
    var LiteTextNode = (function (_super) {
        __extends(LiteTextNode, _super);
        function LiteTextNode(text, option) {
            if (option === void 0) { option = {}; }
            var _this = _super.call(this, 'text', option) || this;
            _this.text = text;
            return _this;
        }
        LiteTextNode.prototype.toString = function () { return this.text; };
        LiteTextNode.prototype.toDOM = function () { return document.createTextNode(this.text); };
        return LiteTextNode;
    }(LiteNodeBase));
    var LiteNode = (function (_super) {
        __extends(LiteNode, _super);
        function LiteNode(tag, option) {
            if (tag === void 0) { tag = ''; }
            if (option === void 0) { option = {}; }
            var _this = _super.call(this, tag, option) || this;
            _this.childlen = [];
            _this.attribute = {};
            _this.newLineBegin = false;
            _this.newLine = true;
            _this.changeOption(option);
            return _this;
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
        LiteNode.prototype.changeTag = function (tag) { this.tag = tag; };
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
    }(LiteNodeBase));
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
            this.parseLines(lines);
            return this;
        };
        CommonMark.prototype.parseLines = function (lines) {
            var _this = this;
            var type = CommonMarkTypes.NONE;
            lines.forEach(function (line, index) {
                var ltype = _this.lineType(line, type);
                if (ltype === CommonMarkTypes.NONE) {
                    if (type === CommonMarkTypes.PARAGRAPH) {
                        type = CommonMarkTypes.NONE;
                    }
                }
                else if (ltype === CommonMarkTypes.HORIZON) {
                    type = CommonMarkTypes.NONE;
                }
                else if (ltype === CommonMarkTypes.HEADLINE1 || ltype === CommonMarkTypes.HEADLINE2) {
                    _this.addHeadlineSP(type, line);
                    type = CommonMarkTypes.NONE;
                    return;
                }
                else if (type === CommonMarkTypes.PARAGRAPH) {
                    _this.addParagraph(type, line);
                    type = ltype;
                    return;
                }
                type = _this.addLine(ltype, type, line);
            });
        };
        CommonMark.prototype.addLine = function (ltype, type, line) {
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
        };
        CommonMark.prototype.lineType = function (line, type) {
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
            if (!node || node.childlen === undefined) {
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
        CommonMark.prototype.inList = function () {
            var last = this.lastNode();
            if (!last || last.getTag === undefined) {
                return false;
            }
            return last.getTag() === 'ul';
        };
        CommonMark.prototype.addHeadline = function (now, line) {
            var _a = line.split(/\s+/, 2), lv = _a[0], title = _a[1];
            var root = new LiteNode('h' + lv.length);
            root.appendChild(new LiteTextNode(title));
            this.root.appendChild(root);
        };
        CommonMark.prototype.addHeadlineSP = function (now, line) {
            var last = this.lastNode();
            last.changeTag(now === CommonMarkTypes.HEADLINE1 ? 'h1' : 'h2');
        };
        CommonMark.prototype.addUList = function (now, line) {
            if (now === CommonMarkTypes.ULIST) {
                return;
            }
            var root = new LiteNode('ul', { newLineBegin: true });
            this.root.appendChild(root);
        };
        CommonMark.prototype.addUListItem = function (now, line) {
            var item = new LiteNode('li');
            item.appendChild(new LiteTextNode(line.split(/[\-\*] /, 2)[1]));
            this.innermostNode(this.lastNode(), 'ul').appendChild(item);
        };
        CommonMark.prototype.appendUListItem = function (now, line) {
            var lastli = this.innermostNode(this.lastNode(), 'li');
            if (lastli.childlen[lastli.childlen.length - 1].getTag === undefined) {
                var textnode = lastli.childlen[lastli.childlen.length - 1];
                var p_1 = new LiteNode('p', { oneLine: false });
                p_1.appendChild(textnode);
                lastli.childlen[lastli.childlen.length - 1] = p_1;
                lastli.changeOption({ newLineBegin: true, oneLine: false });
            }
            line = line.replace(/^\t/, '');
            var p = new LiteNode('p', { oneLine: false });
            p.appendChild(new LiteTextNode(line));
            lastli.appendChild(p);
        };
        CommonMark.prototype.addParagraph = function (now, line) {
            line = line.replace(/^\s+/, '');
            if (!line) {
                return;
            }
            if (now !== CommonMarkTypes.PARAGRAPH) {
                var root = new LiteNode('p');
                this.root.appendChild(root);
            }
            else {
                line = '\n' + line;
            }
            var proot = this.lastNode();
            proot.appendChild(new CommonMarkInline().parseInline(line));
        };
        CommonMark.prototype.addCodeBlock = function (now, line) {
            var softtab = !!line.match(/^\>/);
            line += '\n';
            if (now !== CommonMarkTypes.CODE) {
                var root = new LiteNode('pre');
                var coderoot_1 = new LiteNode('code', { oneLine: true });
                root.appendChild(coderoot_1);
                if (line.match(/^\>/)) {
                    var r = new LiteNode('blockquote', { newLineBegin: true });
                    r.appendChild(root);
                    root = r;
                }
                this.root.appendChild(root);
            }
            line = line.replace(/^\>{0,1}(\t|    | {1,3}\t)/, '');
            if (softtab) {
                line = line.replace('\t', '  ');
            }
            var coderoot = this.innermostNode(this.lastNode(), 'code');
            coderoot.appendChild(new LiteTextNode(line));
        };
        CommonMark.prototype.addHorizon = function (now, line) {
            var root = new LiteNode('hr');
            this.root.appendChild(root);
        };
        return CommonMark;
    }());
    TSCommonMark.CommonMark = CommonMark;
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
})(TSCommonMark || (TSCommonMark = {}));
var cmarked = {
    toString: function (md) { return TSCommonMark.parse2String(md); },
    toDOM: function (md) { return TSCommonMark.parse2DOMTree(md); },
};
