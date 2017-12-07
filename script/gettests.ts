// とりあえずすべてのテスト(サンプル)を本家からとってくるスクリプト。
// 正直面倒なのでHTMLのパースとかせず、1行1行読んで調べる。
// 本家が頑張り始めたりテストが最後までできた暁には、テストアップデーターとしてちゃんと作る。

// TODO:
// * newtestsの内容削除

import http = require( 'http' );
import fs = require( 'fs' );
import path = require( 'path' );

const VER = '0.28';
const BASE = 'http://spec.commonmark.org';
const DIR = './newtest/';

interface TESTSET { [ key: string ]: { md: string, html: string } }

function Fetch( url: string ): Promise<http.IncomingMessage>
{
	return new Promise( ( resolve, reject ) =>
	{
		http.get( url, ( res ) =>
		{
			if ( res.statusCode === 301 && res.headers.location )
			{
				return resolve( Fetch( res.headers.location ) );
			}
			if ( res.statusCode !== 200 ) { return reject( res.statusCode ); }
			resolve( res );
		} ).on( 'error', ( e ) => { reject( e ); } );
	} );
}

function Download( res: http.IncomingMessage ): Promise<string>
{
	return new Promise( ( resolve, reject ) =>
	{
		res.setEncoding( 'utf8' );
		let rawData = '';
		res.on( 'data', ( chunk ) => { rawData += chunk; } );
		res.on( 'end', () => { resolve( rawData ); } );
		res.on( 'error', ( e ) => { reject( e ); } );
	} );
}

function Analysis( html: string )
{
	const lines = html.split( '\n' );
	let examplenum = '';
	let mode: 0|1|2 = 0;
	let code: string = '';
	const tests: TESTSET = {};

	lines.forEach( ( line ) =>
	{
		if ( line === '</code></pre>' )
		{
			if ( !examplenum ) { return; }
			if ( !tests[ examplenum ] ) { tests[ examplenum ] = { md: '', html: '' } }

			code = code.replace( /→/g, '	' ).replace( /ὐ/g, ' ' ).replace( /\<span class\=\"space\"\> \<\/span\>/g, ' ' ).replace( /\&gt\;/g, '>' );
			if ( mode === 1 )
			{
				// Markdown
				tests[ examplenum ].md = code;
			} else
			{
				// HTML
				tests[ examplenum ].html = code.replace( /\&lt\;/g, '<' ).replace( /\&quot\;/g, '"' ).replace( /\&amp\;/g, '&' );
			}

			code = '';
			mode = 0;
		} else if( mode === 0 )
		{
			let match = line.match( /^\<a href\=\"\#example\-([0-9]+)\">/ );
			if ( match && match[ 1 ] ) { examplenum = match[ 1 ]; }

			if ( !examplenum ) { return; }

			match = line.match( /^\<pre\>\<code class\=\"language\-markdown\"\>(.*)$/ );
			if ( match ) { code += match[ 1 ] + '\n'; mode = 1; }

			match = line.match( /^\<pre\>\<code class\=\"language\-html\"\>(.*)$/ );
			if ( match ) { code += match[ 1 ] + '\n'; mode = 2; }
		} else if( mode )
		{
			code += line + '\n';
		}
	} );

	return Promise.resolve( tests );
}

function CreateDir( dir: string ): Promise<boolean>
{
	return new Promise( ( resolve, reject ) =>
	{
		fs.mkdir( dir, ( error ) =>
		{
			if ( error && error.code != 'EEXIST' ) { return reject( error ); }
			resolve( true );
		} );
	} );
}

function SaveFile( file: string, data: string ): Promise<boolean>
{
	return new Promise( ( resolve, reject ) =>
	{
		fs.writeFile( file, data, ( error ) =>
		{
			if ( error ) { return reject( error ); }
			resolve( true );
		} );
	} );
}

function Save( tests: TESTSET )
{
	return CreateDir( DIR ).then( () =>
	{
		const p: Promise<boolean>[] = [];

		Object.keys( tests ).forEach( ( key ) =>
		{
			const file = ( '0000' + key ).slice( -4 );
			p.push( SaveFile( path.join( DIR, file + '.md' ), tests[ key ].md ) );
			p.push( SaveFile( path.join( DIR, file + '.html' ), tests[ key ].html ) );
		} );

		return Promise.all( p ).then( () => { return Promise.resolve( tests ); } );
	} );
}

function Main()
{
	return Fetch( [ BASE, VER ].join( '/' ) );
}

Main().then( Download ).then( Analysis ).then( Save ).then( ( tests ) =>
{
	console.log( 'End:', Object.keys( tests ).length );
} ).catch( ( e ) => { console.log( e ); } );
