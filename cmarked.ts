/*
http://spec.commonmark.org/
*/

module TSCommonMark
{
	enum CommonMarkTypes
	{
		NONE,
		HEADLINE,
		HEADLINE1,
		HEADLINE2,
		PARAGRAPH,
		ANCHOR,
		CODE,
		ULIST,
		UITEM,
		HORIZON,
	};

	interface InlineParseData
	{
		prev?: string,
		node?: LiteNode,
		next?: string,
	}

	export interface TagOption
	{
		newLineBegin?: boolean,
		oneLine?: boolean
	}

	export class LiteNodeBase
	{
		protected tag: string;
		protected close: boolean;

		constructor( tag: string, option: TagOption = {} )
		{
			this.tag = tag;
			this.close = true;
			switch ( tag )
			{
			case 'br':
			case 'hr':
				this.close = false;
				break;
			}
		}

		public changeOption( option: TagOption = {} ) {}

		public toString(): string
		{
			return this.close ? '<' + this.tag + ' />' : [ '<', '></', '>' ].join( this.tag );
		}

		public toDOM(): HTMLElement | Text { return document.createElement( this.tag ); }
	}

	class LiteTextNode extends LiteNodeBase
	{
		private text: string;
		constructor( text: string, option: TagOption = {} )
		{
			super( 'text', option );
			this.text = text;
		}

		public toString(): string { return this.text; }

		public toDOM(): HTMLElement | Text { return document.createTextNode( this.text ); }
	}

	class LiteNode extends LiteNodeBase
	{
		public childlen: LiteNodeBase[];
		private attribute: { [ key: string ]: string };
		private newLineBegin: boolean;
		private newLine: boolean;

		constructor( tag: string = '', option: TagOption = {} )
		{
			super( tag, option );
			this.childlen = [];
			this.attribute = {};
			this.newLineBegin = false;
			this.newLine = true;
			this.changeOption( option );
		}

		public changeOption( option: TagOption = {} )
		{
			if ( option.newLineBegin !== undefined ) { this.newLineBegin = !!option.newLineBegin; }
			if ( option.oneLine !== undefined ) { this.newLine = !option.oneLine; }
		}

		public getTag() { return this.tag; }

		public changeTag( tag: string ) { this.tag = tag; }

		public appendChild( children: LiteNodeBase | LiteNodeBase[] )
		{
			if ( Array.isArray( children ) )
			{
				children.forEach( ( child ) => { this.childlen.push( child ); } );
			} else
			{
				this.childlen.push( children );
			}
		}

		public setAttribute( key: string, value: string )
		{
			this.attribute[ key ] = value;
		}

		public toString(): string
		{
			if ( !this.tag ) { return this.toStringChildren(); }
			if ( !this.close ) { return '<' + this.tag + ' />' + ( this.newLine ? '\n' : '' );}
			return '<' + this.tag + this.toStringAttribute() + '>' + ( this.newLineBegin ? '\n' : '' ) + this.toStringChildren() + '</' + this.tag + '>' + ( this.newLine ? '\n' : '' );
		}

		private toStringAttribute(): string
		{
			const keys = Object.keys( this.attribute );
			if ( keys.length <= 0 ) { return ''; }
			return ' ' + keys.map( ( key ) =>
			{
				return key + '="' + (this.attribute[ key ] || '').replace( /\"/g, '&quot;' ) + '"';
			} ).join( ' ' );
		}

		private toStringChildren(): string
		{
			return this.childlen.map( ( child ) => { return child.toString() } ) . join( '' );
		}

		public toDOM( node?: HTMLElement ): HTMLElement | Text
		{
			const root = node || document.createElement( this.tag || 'div' );
			Object.keys( this.attribute ).forEach( ( key ) =>
			{
				if ( key === 'class' )
				{
					root.classList.add( ... this.attribute.class.split( ' ' ) );
				} else
				{
					(<any>root)[ key ] = this.attribute[ key ];
				}
			} );
			this.childlen.forEach( ( child ) =>
			{
				root.appendChild( child.toDOM() );
			} );
			return root;
		}
	}

	export class CommonMark
	{
		private root: LiteNode;
		//private stack: LiteNode[];

		constructor()
		{
			this.root = new LiteNode();
		}

		public toDOM( node?: HTMLElement ) { return this.root.toDOM( node ); }

		public toString(): string
		{
			return this.root.toString();
		}

		public parse( source: string )
		{
			const lines = source.split( '\n' );

			this.parseLines( lines );

			return this;
		}

		private parseLines( lines: string[] )
		{
			let type: CommonMarkTypes = CommonMarkTypes.NONE;

			lines.forEach( ( line, index ) =>
			{
				const ltype = this.lineType( line, type );

				if ( ltype === CommonMarkTypes.NONE )
				{
					if ( type === CommonMarkTypes.PARAGRAPH ) { type = CommonMarkTypes.NONE; }
				} else if( ltype === CommonMarkTypes.HORIZON )
				{
					type = CommonMarkTypes.NONE;
				} else if( ltype === CommonMarkTypes.HEADLINE1 || ltype === CommonMarkTypes.HEADLINE2 )
				{
					this.addHeadlineSP( type, line );
					type = CommonMarkTypes.NONE;
					return;
				} else if ( type === CommonMarkTypes.PARAGRAPH )
				{
					this.addParagraph( type, line );
					type = ltype;
					return;
				}

				type = this.addLine( ltype, type, line );
			} );
		}

		private addLine( ltype: CommonMarkTypes, type: CommonMarkTypes, line: string )
		{
			switch ( ltype )
			{
				case CommonMarkTypes.HEADLINE:
					this.addHeadline( type, line );
					return CommonMarkTypes.NONE;
				case CommonMarkTypes.ULIST:
					this.addUList( type, line );
					this.addUListItem( type, line );
					return ltype;
				case CommonMarkTypes.UITEM:
					this.appendUListItem( type, line );
					break;
				case CommonMarkTypes.CODE:
					this.addCodeBlock( type, line );
					return ltype;
				case CommonMarkTypes.PARAGRAPH:
					this.addParagraph( type, line );
					return ltype;
				case CommonMarkTypes.HORIZON:
					this.addHorizon( type, line );
					return CommonMarkTypes.NONE;
			}
			return type;
		}

		private lineType( line: string, type: number ): CommonMarkTypes
		{
			if ( this.inList() && line.match( /^\t/ ) ) { return CommonMarkTypes.UITEM; }

			// Headline
			if ( line.match( /^\#{1,6}\s+/ ) ) { return CommonMarkTypes.HEADLINE; }

			// Special Headline
			if ( type === CommonMarkTypes.PARAGRAPH )
			{
				if ( line.match( /^\={2,}$/ ) ) { return CommonMarkTypes.HEADLINE1; }
				if ( line.match( /^\-{2,}$/ ) ) { return CommonMarkTypes.HEADLINE2; }
			}

			// Line
			if ( line.match( /^ {0,3}(\*\s*\*\s*\*[\s\*]*|\-\s*\-\s*\-[\s\-]*|\_\s*\_\s*\_[\s\_]*)$/ ) ) { return CommonMarkTypes.HORIZON; }

			// List
			if ( line.match( /^ {0,3}[\-\*] / ) ) { return CommonMarkTypes.ULIST; }

			// Code block
			if ( line.match( /^\>{0,1}(\t|    | {1,3}\t)/ ) ) { return CommonMarkTypes.CODE; }

			// No line
			if ( !line ) { return CommonMarkTypes.NONE; }

			return CommonMarkTypes.PARAGRAPH;
		}

		private lastNode( node: LiteNode = this.root ): LiteNode|null
		{
			return <LiteNode>node.childlen[ this.root.childlen.length - 1 ];
		}

		private innermostNode( node: LiteNode|null, tag?: string )
		{
			const result = this._innermostNode( node, tag );
			if ( result === null ) { return node; }
			return result;
		}

		private _innermostNode( node: LiteNode|null, tag?: string ): LiteNode|null
		{
			// Text Node
			if ( !node || node.childlen === undefined ) { return null; }

			if ( node.getTag() === tag )
			{
				const last = this._innermostNode( <LiteNode>this.lastNode( node ), tag ) || node;
				return node;
			} else
			{
				// Last LiteNode
				if ( node.childlen.length <= 0 ) { return node; }
			}
			return this._innermostNode( <LiteNode>this.lastNode( node ), tag );
		}

		private inList(): boolean
		{
			const last = this.lastNode();
			if ( !last || last.getTag === undefined ) { return false; }
			return last.getTag() === 'ul';
		}

		public parseInline( line: string )
		{
			const nodes: LiteNodeBase[] = [];

			let data = this.margeInlineNodes( nodes, this.parseEmphasis( line ), false );
			data = this.margeInlineNodes( nodes, this.parseAnchor( data.next || '' ), false );

			if ( data.next ) { nodes.push( new LiteTextNode( data.next ) ); }

			return nodes;
		}

		private margeInlineNodes( nodes: LiteNodeBase[], data: InlineParseData, recrusion: boolean )
		{
			if ( data.prev )
			{
				if ( recrusion )
				{
					const pdata = this.parseInline( data.prev );
					nodes.push( ... pdata );
				} else
				{
					nodes.push( new LiteTextNode( data.prev ) );
				}
				delete data.prev;
			}

			if ( data.node )
			{
				nodes.push( data.node );
				delete data.node;
			}

			return data;
		}

		private parseEmphasis( line: string ): InlineParseData
		{
			const r = /\*([^\*]+?)\*/g;
			const match = r.exec( line );

			if ( !match ) { return { next: line }; }

			const data: InlineParseData = {};

			if ( match.index ) { data.prev = line.substr( 0, match.index ); }
			if ( r.lastIndex < line.length ) { data.next = line.substr( r.lastIndex ); }

			data.node = new LiteNode( 'em', { oneLine: true } );
			data.node.appendChild( new LiteTextNode( match[ 1 ] || '' ) );

			return data;
		}

		private parseAnchor( line: string ): InlineParseData
		{
			const r = /\[(.+?)\]\((.*?)\)/g;
			const match = r.exec( line );

			if ( !match ) { return { next: line }; }

			const data: InlineParseData = {};

			if ( match.index ) { data.prev = line.substr( 0, match.index ); }
			if ( r.lastIndex < line.length ) { data.next = line.substr( r.lastIndex ); }

			data.node = new LiteNode( 'a', { oneLine: true } );
			data.node.setAttribute( 'href', match[ 2 ] || '' );
			data.node.appendChild( new LiteTextNode( match[ 1 ] || '' ) );

			return data;
		}

		private addHeadline( now: CommonMarkTypes, line: string )
		{
			const [ lv, title ] = line.split( /\s+/, 2 );
			const root = new LiteNode( 'h' + lv.length );
			root.appendChild( new LiteTextNode( title ) );
			this.root.appendChild( root );
		}

		private addHeadlineSP( now: CommonMarkTypes, line: string )
		{
			const last = <LiteNode>this.lastNode();
			last.changeTag( now === CommonMarkTypes.HEADLINE1 ? 'h1' : 'h2' );
		}

		private addUList( now: CommonMarkTypes, line: string )
		{
			if ( now === CommonMarkTypes.ULIST ) { return; }
			const root = new LiteNode( 'ul', { newLineBegin: true } );
			this.root.appendChild( root );
		}

		private addUListItem( now: CommonMarkTypes, line: string )
		{
			const item = new LiteNode( 'li' );
			item.appendChild( new LiteTextNode( line.split( /[\-\*] /, 2 )[ 1 ] ) );
			(<LiteNode>this.innermostNode( this.lastNode(), 'ul' )).appendChild( item );//TODO:
		}

		private appendUListItem( now: CommonMarkTypes, line: string )
		{
			const lastli = <LiteNode>this.innermostNode( this.lastNode(), 'li' );

			if ( (<LiteNode>lastli.childlen[ lastli.childlen.length - 1 ]).getTag === undefined )
			{
				// Last li child is TextNode.

				const textnode = <LiteTextNode>lastli.childlen[ lastli.childlen.length - 1 ];
				const p = new LiteNode( 'p', { oneLine: false } );
				p.appendChild( textnode );
				lastli.childlen[ lastli.childlen.length - 1 ] = p;
				lastli.changeOption( { newLineBegin: true, oneLine: false } );
			}
			line = line.replace( /^\t/, '' );
			const p = new LiteNode( 'p', { oneLine: false } );
			p.appendChild( new LiteTextNode( line ) );
			lastli.appendChild( p );
		}

		private addParagraph( now: CommonMarkTypes, line: string )
		{
			line = line.replace( /^\s+/, '' );
			if ( !line ) { return; }
			if ( now !== CommonMarkTypes.PARAGRAPH )
			{
				const root = new LiteNode( 'p' );
				this.root.appendChild( root );
			} else { line = '\n' + line; }

			const proot = <LiteNode>this.lastNode();
			proot.appendChild( this.parseInline( line ) );
		}

		private addCodeBlock( now: CommonMarkTypes, line: string )
		{
			let softtab = !!line.match( /^\>/ );
			line += '\n';
			if ( now !== CommonMarkTypes.CODE )
			{
				let root = new LiteNode( 'pre' );
				const coderoot = new LiteNode( 'code', { oneLine: true } );
				root.appendChild( coderoot );
				if ( line.match( /^\>/ ) )
				{
					const r = new LiteNode( 'blockquote', { newLineBegin: true } );
					r.appendChild( root );
					root = r;
				}
				this.root.appendChild( root );
			}

			line = line.replace( /^\>{0,1}(\t|    | {1,3}\t)/, '' );
			if ( softtab ) { line = line.replace( '\t', '  ' ); }
			const coderoot = <LiteNode>this.innermostNode( this.lastNode(), 'code' );
			coderoot.appendChild( new LiteTextNode( line ) );
		}

		private addHorizon( now: CommonMarkTypes, line: string )
		{
			const root = new LiteNode( 'hr' );
			this.root.appendChild( root );
		}

		/*private popStack()
		{
			if ( this.stack.length <= 1 ) { return; }
			this.stack.pop();
		}

		private initStack()
		{
			this.stack = [ this.root ];
		}

		private lastStack()
		{
			return this.stack[ this.stack.length - 1 ];
		}*/

	}

	export function parse2String( source: string ): string
	{
		return new CommonMark().parse( source ).toString();
	}

	export function parseLine2String( line: string ): string
	{
		const list = new CommonMark().parseInline( line );
		return list.map( ( child ) => { return child.toString(); } ).join( '' );
	}

	export function parse2DOMTree( source: string, node?: HTMLElement ): HTMLElement
	{
		return <HTMLElement>new CommonMark().parse( source ).toDOM( node );
	}

	export function parseLine2DOMTree( line: string, node?: HTMLElement ): HTMLElement
	{
		const root = node || document.createElement( 'p' );
		new CommonMark().parseInline( line ).forEach( ( child ) =>
		{
			root.appendChild( child.toDOM() );
		} );
		return root;
	}

}

export = TSCommonMark;
