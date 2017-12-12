declare module TSCommonMark {
    interface LiteNodeBase {
        toString(): string;
        toDOM(): HTMLElement | Text;
    }
    class CommonMark {
        private root;
        constructor();
        toDOM(node?: HTMLElement): HTMLElement | Text;
        toString(): string;
        parse(source: string): this;
        private checkLastNode(tag);
        private lastNode(node?);
        private innermostNode(node, tag?);
        private _innermostNode(node, tag?);
    }
    function parse2String(source: string): string;
    function parseLine2String(line: string): string;
    function parse2DOMTree(source: string, node?: HTMLElement): HTMLElement;
    function parseLine2DOMTree(line: string, node?: HTMLElement): HTMLElement;
}
