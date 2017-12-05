declare module TSCommonMark {
    class CommonMark {
        private root;
        private stack;
        constructor();
        toDOM(node?: HTMLElement): HTMLElement | Text;
        toString(): string;
        parse(source: string): this;
        private lineType(line);
        private parseInline(line);
        private parseAnchor(line);
        private addHeadline(now, line);
        private addUList(now, line);
        private addParagraph(now, line);
        private addCodeBlock(now, line);
        private addLine(now, line);
        private popStack();
        private initStack();
        private lastStack();
    }
    function parse2String(source: string): string;
    function parse2DOMTree(source: string, node?: HTMLElement): HTMLElement;
}
export = TSCommonMark;
