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
		CODE,
		ULIST,
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
		private newLineBegin: boolean;
		private newLine: boolean;

		constructor( tag: string = '', option: TagOption = {} )
		{
			super( tag, option );
			this.childlen = [];
			this.newLineBegin = !!option.newLineBegin;
			this.newLine = !option.oneLine;
		}

		public appendChild( child: LiteNodeBase )
		{
			this.childlen.push( child );
		}

		public toString(): string
		{
			if ( !this.tag ) { return this.toStringChildren(); }
			if ( !this.close ) { return '<' + this.tag + ' />' + ( this.newLine ? '\n' : '' );}
			return '<' + this.tag + '>' + ( this.newLineBegin ? '\n' : '' ) + this.toStringChildren() + '</' + this.tag + '>' + ( this.newLine ? '\n' : '' );
		}

		private toStringChildren(): string
		{
			return this.childlen.map( ( child ) => { return child.toString() } ) . join( '' );
		}

		public toDOM(): HTMLElement | Text
		{
			const root = document.createElement( this.tag || 'div' );
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

		public toDOM() { return this.root.toDOM(); }

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
					this.addCodeBlock( type, line + '\n' );
					type = ltype;
					break;
				}
			} );

			return this;
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

		private addCodeBlock( now: CommonMarkTypes, line: string )
		{
			let softtab = !!line.match( /^\>/ );
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

		private lineType( line: string ): CommonMarkTypes
		{
			// Headline
			if ( line.match( /^\#{1,6}\s+/ ) ) { return CommonMarkTypes.HEADLINE; }

			// List
			if ( line.match( /^ {0,3}\- / ) ) { return CommonMarkTypes.ULIST; }

			// Code block
			if ( line.match( /^\>{0,1}(\t|    | {1,3}\t)/ ) ) { return CommonMarkTypes.CODE; }

			return CommonMarkTypes.NONE;
		}

	}

	export function parse2String( source: string ): string
	{
		return new CommonMark().parse( source ).toString();
	}

	export function parse2DOMTree( source: string ): HTMLElement
	{
		return <HTMLElement>new CommonMark().parse( source ).toDOM();
	}

}

export = TSCommonMark;
