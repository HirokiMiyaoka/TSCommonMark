// newtestsとtestsの差分を調べる。
// とはいってもnewtestsの内容が真になるので、差分があるかどうかのチェックしかしない。

import fs = require( 'fs' );
import path = require( 'path' );

const MODE =
{
	NOT_FOUND: false,
	DIFFERENT: true,
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

function GetFiles( dir: string ): Promise<string[]>
{
	return new Promise( ( resolve, reject ) =>
	{
		fs.readdir( dir, ( error, items ) =>
		{
			if ( error ) { return reject( error ); }

			const files: string[] = [];

			items.forEach( ( item ) =>
			{
				if ( item.match( /^\./ ) ) { return; }
				const stat = fs.statSync( path.join( dir, item ) );
				if ( stat && stat.isFile() ) { files.push( item ); }
			} );

			resolve( files );
		} );
	} );
}

function LoadFile( file: string ): Promise<string>
{
	return new Promise( ( resolve, reject )=>
	{
		fs.readFile( file, 'utf8', ( error, data ) =>
		{
			if ( error ) { return reject( error ); }
			resolve( data );
		} );
	} );
}

function CheckDiff( olddir: string, newdir: string, file: string )
{
	const p: Promise<string>[] = [];

	p.push( LoadFile( path.join( olddir, file ) ) );
	p.push( LoadFile( path.join( newdir, file ) ) );

	return Promise.all( p ).then( ( data ) =>
	{
		if ( data[ 0 ] !== data[ 1 ] )
		{
			if ( MODE.DIFFERENT ) { console.log( COLOR.RED + 'Different:' + COLOR.RESET, file ); }
			return Promise.resolve( false );
		}
		return Promise.resolve( true );
	} ).catch( ( e ) =>
	{
		if ( MODE.NOT_FOUND ) { console.log( COLOR.RED + 'Not found:' + COLOR.RESET, file ); }
		return Promise.resolve( false );
	} );
}

function Main( olddir: string, newdir: string )
{
	return GetFiles( newdir ).then( ( files ) =>
	{
		const p: Promise<boolean>[] = [];
		files.forEach( ( file ) =>
		{
			p.push( CheckDiff( olddir, newdir, file ) );
		} );

		return Promise.all( p );
	} );
}

Main( 'test', 'newtest' ).then( ( data ) =>
{
	const result = { success: 0, failure: 0 };

	data.forEach( ( r ) => { ++result[ r ? 'success' : 'failure' ]; } );

	console.log( result );
} ).catch( ( e ) =>
{
	console.log( 'Error:', e );
} );
