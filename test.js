const path = require( 'path' );
const fs = require( 'fs' );
const cmarked = require( './cmarked' );

const MODE =
{
	all: true,
	outputErrorInfo: true,
	begin: 0,
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
		console.log( 'Error:', file.replace( '.md', '' ) );
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
	console.log( 'Success:', file.replace( '.md', '' ) );
	return true;
}

for( let i = 2 ; i < process.argv.length; ++i )
{
	if ( process.argv[ i ] ){}
}

let error = [];
const list = GetTestList();
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
