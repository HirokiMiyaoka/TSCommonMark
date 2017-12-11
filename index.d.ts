declare module TSCommonMark {
    interface TagOption {
        newLineBegin?: boolean;
        oneLine?: boolean;
    }
    class LiteNodeBase {
        protected tag: string;
        protected close: boolean;
        constructor(tag: string, option?: TagOption);
        changeOption(option?: TagOption): void;
        toString(): string;
        toDOM(): HTMLElement | Text;
    }
    class CommonMark {
        private root;
        constructor();
        toDOM(node?: HTMLElement): HTMLElement | Text;
        toString(): string;
        parse(source: string): this;
        private parseLines(lines);
        private addLine(ltype, type, line);
        private lineType(line, type);
        private lastNode(node?);
        private innermostNode(node, tag?);
        private _innermostNode(node, tag?);
        private inList();
        parseInline(line: string): LiteNodeBase[];
        private margeInlineNodes(nodes, data, recrusion);
        private parseEmphasis(line);
        private parseAnchor(line);
        private addHeadline(now, line);
        private addHeadlineSP(now, line);
        private addUList(now, line);
        private addUListItem(now, line);
        private appendUListItem(now, line);
        private addParagraph(now, line);
        private addCodeBlock(now, line);
        private addHorizon(now, line);
    }
    function parse2String(source: string): string;
    function parseLine2String(line: string): string;
    function parse2DOMTree(source: string, node?: HTMLElement): HTMLElement;
    function parseLine2DOMTree(line: string, node?: HTMLElement): HTMLElement;
}
