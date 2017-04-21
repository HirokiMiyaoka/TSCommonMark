declare module TSCommonMark {
    class CommonMark {
        private root;
        private stack;
        constructor();
        toDOM(): HTMLElement | Text;
        toString(): string;
        parse(source: string): this;
        private addHeadline(now, line);
        private addUList(now, line);
        private addCodeBlock(now, line);
        private popStack();
        private initStack();
        private lastStack();
        private lineType(line);
    }
    function parse2String(source: string): string;
    function parse2DOMTree(source: string): HTMLElement;
}
export = TSCommonMark;
