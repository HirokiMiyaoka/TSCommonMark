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
		HEADLINE3,
		HEADLINE4,
		HEADLINE5,
		HEADLINE6,
		PARAGRAPH,
		ANCHOR,
		CODE,
		ULIST,
		UITEM,
		HORIZON,
	};

	const TagTable: { [ keys: number ]: string } =
	{
		[ CommonMarkTypes.HEADLINE1 ]: 'h1',
		[ CommonMarkTypes.HEADLINE2 ]: 'h2',
		[ CommonMarkTypes.HEADLINE3 ]: 'h3',
		[ CommonMarkTypes.HEADLINE4 ]: 'h4',
		[ CommonMarkTypes.HEADLINE5 ]: 'h5',
		[ CommonMarkTypes.HEADLINE6 ]: 'h6',
		[ CommonMarkTypes.PARAGRAPH ]: 'p',
		[ CommonMarkTypes.ULIST     ]: 'ul',
		[ CommonMarkTypes.HORIZON   ]: 'hr',
	};

	interface InlineParseData
	{
		prev?: string,
		node?: LiteNode,
		next?: string,
	}

	interface TagOption
	{
		newLineBegin?: boolean,
		oneLine?: boolean
	}

	export interface LiteNodeBase
	{
		toString(): string;

		toDOM(): HTMLElement | Text;
	}

	class LiteTextNode implements LiteNodeBase
	{
		private text: string;
		constructor( text: string )
		{
			this.text = text;
		}

		public toString(): string { return this.text; }

		public toDOM(): HTMLElement | Text { return document.createTextNode( this.text ); }
	}

	class LiteNode implements LiteNodeBase
	{
		protected tag: string;
		public childlen: LiteNodeBase[];
		private attribute: { [ key: string ]: string };
		private close: boolean;
		private newLineBegin: boolean;
		private newLine: boolean;

		constructor( tag: string = '', option: TagOption = {} )
		{
			this.childlen = [];
			this.attribute = {};
			this.changeTag( tag );
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

		public changeTag( tag: string )
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

	function isTextNode( node: LiteNodeBase )
	{
		return (<LiteNode>node).getTag === undefined;
	}

	export class CommonMark
	{
		private root: LiteNode;

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

			while ( 0 < lines.length )
			{
				const isLastList = this.checkLastNode( 'ul' );
				const block = new CommonMarkBlock().parse( lines, isLastList );
				if ( !block ) { continue; }
				if ( isLastList && ( block.getTag() === 'pre' || block.getTag() === 'p' ) )
				{
					const li = <LiteNode>this.lastNode( <LiteNode>this.lastNode() );
					if ( li.childlen.length === 1 && isTextNode( li.childlen[ 0 ] ) )
					{
						li.changeOption( { newLineBegin: true } );
						const p = new LiteNode( 'p' );
						p.appendChild( li.childlen[ 0 ] );
						li.childlen[ 0 ] = p;
					}
					li.appendChild( block );
					continue;
				}

				this.root.appendChild( block );
			}

			return this;
		}

		private checkLastNode( tag: string )
		{
			const last = this.lastNode();
			if ( !last ) { return false; }
			return last.getTag() === tag;
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
			if ( !node || isTextNode( node ) ) { return null; }

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
	}

	class CommonMarkBlock
	{
		private root: LiteNode;

		constructor()
		{
			this.root = new LiteNode();
		}

		public parse( lines: string[], beforeList: boolean )
		{
			if ( lines.length <= 0  ) { return null; }

			const line = <string>lines.shift();
			const result = this.lineParser( line, beforeList );
			if ( result.type === CommonMarkTypes.NONE ) { return null; }

			const root = this.changeRoot( result.type );

			switch ( result.type )
			{
				case CommonMarkTypes.HORIZON:
					return this.root;
			}

			if ( result.line && result.type !== CommonMarkTypes.CODE )
			{
				this.root.appendChild( this.parseInline( result.line.replace( /^[ \t]+/, '' ) ) );
			}

			switch ( result.type )
			{
				case CommonMarkTypes.HEADLINE1:
				case CommonMarkTypes.HEADLINE2:
				case CommonMarkTypes.HEADLINE3:
				case CommonMarkTypes.HEADLINE4:
				case CommonMarkTypes.HEADLINE5:
				case CommonMarkTypes.HEADLINE6:
					return this.root;
			}

			// Block element.
			switch ( result.type )
			{
				case CommonMarkTypes.PARAGRAPH:
					if ( this.specialHeadline( lines ) )
					{
						return this.root;
					}
					if ( result.option ) { return this.root; }
					this.loopParagraph( lines );
					break;
				case CommonMarkTypes.CODE:
					if ( result.option )
					{
						this.root.changeTag( 'blockquote' );
						this.root.changeOption( { newLineBegin: true } );
						const pre = new LiteNode( 'pre' );
						pre.appendChild( this.loopCodeBlock( lines, <string>result.line ) );
						this.root.appendChild( pre );
					} else
					{
						this.root.changeTag( 'pre' );
						this.root.appendChild( this.loopCodeBlock( lines, <string>result.line ) );
					}
					break;
				case CommonMarkTypes.ULIST:
					this.root.changeOption( { newLineBegin: true } );
					this.root.appendChild( this.createListItem( result.option ) );
					this.loopList( lines );
					break;
			}

			return this.root;
		}

		private lineParser( line: string, beforeList?: boolean ): { type: CommonMarkTypes, line?: string, option?: any }
		{
			// No line
			if ( !line ) { return { type: CommonMarkTypes.NONE }; }

			let result: RegExpMatchArray | null;

			// Headline
			if ( ( result = line.match( /^(\#{1,6})\s+(.*)$/ ) ) )
			{
				return { type: CommonMarkTypes.HEADLINE + result[ 1 ].length, line: result[ 2 ] };
			}

			// Horizon
			if ( line.match( /^ {0,3}(\*\s*\*\s*\*[\s\*]*|\-\s*\-\s*\-[\s\-]*|\_\s*\_\s*\_[\s\_]*)$/ ) )
			{
				return { type: CommonMarkTypes.HORIZON };
			}

			// List
			if ( ( result = line.match( /^ {0,3}[\-\*]([ \t].*)/ ) ) )
			{
				return { type: CommonMarkTypes.ULIST, option: result[ 1 ] };
			}

			if ( beforeList && ( result = line.match( /^\t([^\s]+)/ ) ) )
			{
				return { type: CommonMarkTypes.PARAGRAPH, line: result[ 1 ], option: true };
			}

			// Code block
			if ( ( result = line.match( /^(\>{0,1})(\t|    | {1,3}\t)(.+)/ ) ) )
			{
				return { type: CommonMarkTypes.CODE, line: result[ 3 ].replace( /^\t/, '  ' ), option: !!result[ 1 ] };
			}

			return { type: CommonMarkTypes.PARAGRAPH, line: line };
		}

		private specialHeadline( lines: string[] )
		{
			if ( lines.length <= 0 ) { return false; }
			const line = <string>lines.shift();

			if ( line.match( /^\={2,}$/ ) )
			{
				this.changeRoot( CommonMarkTypes.HEADLINE1 );
				return true;
			}
			if ( line.match( /^\-{2,}$/ ) )
			{
				this.changeRoot( CommonMarkTypes.HEADLINE2 );
				return true;
			}

			lines.unshift( line );
			return false;
		}

		private changeRoot( type: CommonMarkTypes )
		{
			if ( TagTable[ type ] )
			{
				this.root.changeTag( TagTable[ type ] );
				return this.root;
			}

			return this.root;
		}

		private parseInline( line: string )
		{
			return new CommonMarkInline().parseInline( line );
		}

		private loopParagraph( lines: string[] )
		{
			while ( 0 < lines.length )
			{
				const line = <string>lines.shift();
				const result = this.lineParser( line );
				switch ( result.type )
				{
					case CommonMarkTypes.NONE:
						return;
					case CommonMarkTypes.HORIZON:
						lines.unshift( line );
						return;
				}
				this.root.appendChild( this.parseInline( '\n' + line.replace( /^[ \t]+/, '' ) ) );
			}
		}

		private loopCodeBlock( lines: string[], first: string )
		{
			const code = new LiteNode( 'code', { oneLine: true } );
			code.appendChild( new LiteTextNode( first + '\n' ) );

			while ( 0 < lines.length )
			{
				const line = <string>lines.shift();
				const result = this.lineParser( line );
				switch ( result.type )
				{
					case CommonMarkTypes.NONE:
						return code;
				}
				code.appendChild( new LiteTextNode( result.line + '\n' ) );
			}
			return code;
		}

		private loopList( lines: string[] )
		{
			while ( 0 < lines.length )
			{
				const line = <string>lines.shift();
				const result = this.lineParser( line );
				switch ( result.type )
				{
					case CommonMarkTypes.NONE:
						return;
					case CommonMarkTypes.HORIZON:
						lines.unshift( line );
						return;
				}
				this.root.appendChild( this.createListItem( typeof result.option === 'string' ? result.option : '' ) );
			}
		}

		private createListItem( line: string )
		{
			const li = new LiteNode( 'li' );
			const result = this.lineParser( line );
			if ( result.type === CommonMarkTypes.PARAGRAPH )
			{
				li.appendChild( new CommonMarkInline().parseInline( line.replace( /^[ \t]/, '' ) ) );
				return li;
			}
			if ( result.type === CommonMarkTypes.CODE )
			{
				const pre = new LiteNode( 'pre' );
				pre.appendChild( this.loopCodeBlock( [], result.line || '' ) );
				li.appendChild( pre );
				li.changeOption( { newLineBegin: true } );
			}
			return li;
		}
	}

	class CommonMarkInline
	{
		constructor(){}

		public parse( line: string )
		{
			const nodes = this.parseInline( line );
			return {
				toString: () => { return this.toString( nodes ); },
				toDOM: ( node?: HTMLElement ) => { return this.toDOM( nodes, node ); },
			};
		}

		private toString( nodes: LiteNodeBase[] )
		{
			return nodes.map( ( child ) => { return child.toString(); } ).join( '' );
		}

		private toDOM( nodes: LiteNodeBase[], node?: HTMLElement )
		{
			const root = node || document.createElement( 'p' );
			nodes.forEach( ( child ) =>
			{
				root.appendChild( child.toDOM() );
			} );
			return root;
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
	}

	export function parse2String( source: string ): string
	{
		return new CommonMark().parse( source ).toString();
	}

	export function parseLine2String( line: string ): string
	{
		return new CommonMarkInline().parse( line ).toString();
	}

	export function parse2DOMTree( source: string, node?: HTMLElement ): HTMLElement
	{
		return <HTMLElement>new CommonMark().parse( source ).toDOM( node );
	}

	export function parseLine2DOMTree( line: string, node?: HTMLElement ): HTMLElement
	{
		const root = node || document.createElement( 'p' );
		return new CommonMarkInline().parse( line ).toDOM( node );
	}

}
