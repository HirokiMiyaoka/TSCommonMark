/*
http://spec.commonmark.org/
*/
enum CommonMarkTypes
{
	NONE,
	PARAGRAPH,
	CODE,
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

class CommonMark
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
		this.stack = [ this.root ];

		let type: CommonMarkTypes = CommonMarkTypes.NONE;

		const lines = source.split( '\n' );
		lines.forEach( ( line ) =>
		{
			const ltype = this.lineType( line );

			switch ( ltype )
			{
			case CommonMarkTypes.CODE:
				this.addCodeBlock( type, line + '\n' );
				type = ltype;
				break;
			}
		} );

		return this;
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

	private lastStack()
	{
		return this.stack[ this.stack.length - 1 ];
	}

	private lineType( line: string ): CommonMarkTypes
	{
		// 
		if ( line.match( /^\>{0,1}(\t|    | {1,}\t)/ ) ) { return CommonMarkTypes.CODE; }

		return CommonMarkTypes.NONE;
	}

	public static parse2String( source: string ): string
	{
		return new CommonMark().parse( source ).toString();
	}

	public static parse2DOMTree( source: string ): HTMLElement
	{
		return <HTMLElement>new CommonMark().parse( source ).toDOM();
	}

}

function cmarked( source: string ) { return CommonMark.parse2String( source ); }

export = cmarked;
