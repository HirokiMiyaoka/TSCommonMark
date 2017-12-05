/*
http://spec.commonmark.org/
*/

module TSCommonMark
{
	enum CommonMarkTypes
	{
		NONE,
		HEADLINE,
		PARAGRAPH,
		ANCHOR,
		CODE,
		ULIST,
		LINE,
	};

	interface TagOption
	{
		newLineBegin?: boolean,
		oneLine?: boolean
	}

	class LiteNodeBase
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
		private childlen: LiteNodeBase[];
		private attribute: { [ key: string ]: string };
		private newLineBegin: boolean;
		private newLine: boolean;

		constructor( tag: string = '', option: TagOption = {} )
		{
			super( tag, option );
			this.childlen = [];
			this.attribute = {};
			this.newLineBegin = !!option.newLineBegin;
			this.newLine = !option.oneLine;
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

	export class CommonMark
	{
		private root: LiteNode;
		private stack: LiteNode[];

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
			this.initStack();

			let type: CommonMarkTypes = CommonMarkTypes.NONE;

			const lines = source.split( '\n' );
			lines.forEach( ( line ) =>
			{
				const ltype = this.lineType( line );

				if ( ltype === CommonMarkTypes.NONE )
				{
					if ( type === CommonMarkTypes.PARAGRAPH ) { type = CommonMarkTypes.NONE; }
				} else if ( type === CommonMarkTypes.PARAGRAPH )
				{
					this.addParagraph( type, line );
					type = ltype;
					return;
				}

				switch ( ltype )
				{
				case CommonMarkTypes.HEADLINE:
					this.addHeadline( type, line );
					type = CommonMarkTypes.NONE;
					break;
				case CommonMarkTypes.ULIST:
					this.addUList( type, line );
					type = ltype;
					break;
				case CommonMarkTypes.CODE:
					this.addCodeBlock( type, line );
					type = ltype;
					break;
				case CommonMarkTypes.PARAGRAPH:
					this.addParagraph( type, line );
					type = ltype;
					break;
				case CommonMarkTypes.LINE:
					this.addLine( type, line );
					type = CommonMarkTypes.NONE;
					break;
				}
			} );

			return this;
		}

		private lineType( line: string ): CommonMarkTypes
		{
			// Headline
			if ( line.match( /^\#{1,6}\s+/ ) ) { return CommonMarkTypes.HEADLINE; }

			// Line
			if ( line.match( /^ {0,3}(\*\s*\*\s*\*[\s\*]*|\-\s*\-\s*\-[\s\-]*|\_\s*\_\s*\_[\s\_]*)$/ ) ) { return CommonMarkTypes.LINE; }

			// List
			if ( line.match( /^ {0,3}\- / ) ) { return CommonMarkTypes.ULIST; }

			// Code block
			if ( line.match( /^\>{0,1}(\t|    | {1,3}\t)/ ) ) { return CommonMarkTypes.CODE; }

			// No line
			if ( !line ) { return CommonMarkTypes.NONE; }
			
			return CommonMarkTypes.PARAGRAPH;
		}

		private parseInline( line: string )
		{
			const nodes: LiteNodeBase[] = [];
			const data = this.parseAnchor( line );

			if ( data.prev ) { nodes.push( new LiteTextNode( data.prev ) ); }
			if ( data.anchor ) { nodes.push( data.anchor ); }
			if ( data.next ) { nodes.push( new LiteTextNode( data.next ) ); }

			return nodes;
		}

		private parseAnchor( line: string ): { prev?: string, anchor?: LiteNode, next?: string }
		{
			const r = /\[(.+?)\]\((.*?)\)/g;
			const match = r.exec( line );

			if ( !match ) { return { prev: line }; }

			const data: { prev?: string, anchor?: LiteNode, next?: string } = {};

			if ( match.index ) { data.prev = line.substr( 0, match.index ); }
			if ( r.lastIndex < line.length ) { data.next = line.substr( r.lastIndex ); }

			data.anchor = new LiteNode( 'a', { oneLine: true } );
			data.anchor.setAttribute( 'href', match[ 2 ] || '' );
			data.anchor.appendChild( new LiteTextNode( match[ 1 ] || '' ) );

			return data;
		}

		private addHeadline( now: CommonMarkTypes, line: string )
		{
			this.initStack();
			const [ lv, title ] = line.split( /\s+/, 2 );
			const root = new LiteNode( 'h' + lv.length );
			root.appendChild( new LiteTextNode( title ) );
			this.lastStack().appendChild( root );
			this.stack.push( root );
		}

		private addUList( now: CommonMarkTypes, line: string )
		{
			if ( now !== CommonMarkTypes.ULIST )
			{
				this.popStack(); // TODO:
				const root = new LiteNode( 'ul', { newLineBegin: true } );
				this.lastStack().appendChild( root );
				this.stack.push( root );
			}
			const item = new LiteNode( 'li' );
			item.appendChild( new LiteTextNode( line.split( '- ', 2 )[ 1 ] ) );
			this.lastStack().appendChild( item );
		}

		private addParagraph( now: CommonMarkTypes, line: string )
		{
			line = line.replace( /^\s+/, '' );
			if ( !line ) { return; }
			if ( now !== CommonMarkTypes.PARAGRAPH )
			{
				this.initStack();
				const root = new LiteNode( 'p' );
				this.lastStack().appendChild( root );
				this.stack.push( root );
			} else { line = '\n' + line; }

			const proot = this.lastStack();
			proot.appendChild( this.parseInline( line ) );
		}

		private addCodeBlock( now: CommonMarkTypes, line: string )
		{
			let softtab = !!line.match( /^\>/ );
			line += '\n';
			if ( now !== CommonMarkTypes.CODE )
			{
				this.popStack();
				let root = new LiteNode( 'pre' );
				const coderoot = new LiteNode( 'code', { oneLine: true } );
				root.appendChild( coderoot );
				if ( line.match( /^\>/ ) )
				{
					const r = new LiteNode( 'blockquote', { newLineBegin: true } );
					r.appendChild( root );
					root = r;
				}
				this.lastStack().appendChild( root );
				this.stack.push( coderoot );
			}

			line = line.replace( /^\>{0,1}(\t|    | {1,3}\t)/, '' );
			if ( softtab ) { line = line.replace( '\t', '  ' ); }
			const coderoot = this.stack[ this.stack.length - 1 ];
			coderoot.appendChild( new LiteTextNode( line ) );
		}

		private addLine( now: CommonMarkTypes, line: string )
		{
			this.initStack();
			const root = new LiteNode( 'hr' );
			this.lastStack().appendChild( root );
			this.stack.push( root );
		}

		private popStack()
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
		}

	}

	export function parse2String( source: string ): string
	{
		return new CommonMark().parse( source ).toString();
	}

	export function parse2DOMTree( source: string, node?: HTMLElement  ): HTMLElement
	{
		return <HTMLElement>new CommonMark().parse( source ).toDOM( node );
	}

}

export = TSCommonMark;
