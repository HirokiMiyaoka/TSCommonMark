const path = require( 'path' );
const fs = require( 'fs' );
const cmarked = require( './index' );

const MODE =
{
	all: true,
	outputErrorInfo: true,
	begin: 0,
};

const COLOR =
{
	BLACK:   '\u001b[30m',
	RED:     '\u001b[31m',
	GREEN:   '\u001b[32m',
	YELLOW:  '\u001b[33m',
	BLUE:    '\u001b[34m',
	MAGENTA: '\u001b[35m',
	CYAN:    '\u001b[36m',
	WHITE:   '\u001b[37m',
	RESET:   '\u001b[0m',
};

function ExistsText( file )
{
	if ( !file.match( /\.md$/ ) ) { return false; }
	try
	{
		const result = fs.statSync( path.join( 'test', file.replace( '.md', '.html' ) ) );
		return result.isFile();
	} catch( e ){}
	return false;
}

function GetTestList()
{
	return fs.readdirSync( 'test' ).filter( ExistsText );
}

function Test( file )
{
	const source = fs.readFileSync( path.join( 'test', file ), { encoding: 'utf8' } ).replace( /\r\n|\r/g, '\n' );
	const result = fs.readFileSync( path.join( 'test', file.replace( '.md', '.html' ) ), { encoding: 'utf8' } ).replace( /\r\n|\r/g, '\n' );
	const compiled = cmarked.parse2String( source );

	if ( compiled !== result )
	{
		console.log( COLOR.RED + 'Error:' + COLOR.RESET, file.replace( '.md', '' ) );
		if ( MODE.outputErrorInfo )
		{
			console.log( 'Source:' );
			console.log( source );
			console.log( 'Result:' );
			console.log( compiled );
			console.log( 'Correct:' );
			console.log( result );
		}
		return false;
	}
	console.log( COLOR.GREEN + 'Success:' + COLOR.RESET, file.replace( '.md', '' ) );
	return true;
}

const tests = [];
for( let i = 2 ; i < process.argv.length; ++i )
{
	switch ( process.argv[ i ] )
	{
		case '--test':
		case '-t':
			++i;
			if ( process.argv[ i ] )
			{
				process.argv[ i ].split( ',' ).forEach( ( item ) =>
				{
					if ( !item.match( /[^\d]/ ) && item.length < 4 )
					{
						item = ( '0000' + item ).slice( -4 );
					}
					item += '.md';
					if ( tests.indexOf( item ) < 0  ) { tests.push( item ); }
				} );
			}
			break;
	}
}

let error = [];

const list = 0 < tests.length ? tests : GetTestList();
list.sort();
for ( let i = MODE.begin ; i < list.length ; ++i )
{
	if ( !Test( list[ i ] ) )
	{
		error.push( list[ i ].replace( '.md', '' ) );
		if ( !MODE.all ) { break; }
	}
}

if ( error.length === 0 )
{
	console.log( 'All Success!!' );
}

console.log( 'Failure ' + error.length + ' Tests.' );
console.log( error );
