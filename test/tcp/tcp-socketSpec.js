var net = require('net'),
	proxyquire = require( 'proxyquire' ).noCallThru(),
	TCPEndpoint = require( '../../src/tcp/tcp-endpoint' ),
	_msg = require( '../test-helper/test-helper' ).msg,
	_show = require( '../test-helper/test-helper' ).showChars,
	noop = function() {},
	clientSocket,
	tcpSocket;

var options = {
	tcpPort: 6021,
	tcpHost: '127.0.0.1',
	maxMessageSize: 10,
	logger: { log: function( logLevel, event, msg ){} }
};

describe( 'tcp-socket tests', function() {

	it( 'creates a tcp socket', function( done ) {
		tcpEndpoint = new TCPEndpoint( options, noop );
		tcpEndpoint.on( 'connection', function( socket ) {
			tcpSocket = socket;
			done();
		} );

		clientSocket = new net.Socket();
		clientSocket.connect( 6021, '127.0.0.1', noop );
	} );

	it( 'emits complete messages', function( done ) {
		clientSocket.write( _msg( 'X|Y|1+' ) , 'utf8' );
		
		tcpSocket.once( 'message', function( message ) {
			expect( _show( message ) ).toBe( 'X|Y|1+' );
			done();
		} );
	} );

	it( 'concatenates multiple incomplete messages', function( done ) {
		clientSocket.write( _msg( 'X|Y|' ) , 'utf8' );
		
		setTimeout( function() {
			clientSocket.write( _msg( '2+' ) , 'utf8' );
			tcpSocket.once( 'message', function( message ) {
				expect( _show( message ) ).toBe( 'X|Y|2+' );
				done();
			} );
		}, 5 );
	} );

	it( 'extracts all valid messages if buffer exceeds maxMessageSize ', function( done ) {
		clientSocket.write( _msg( 'X|Y|3+Z|Y|4+X|Y|5+X|Y|6' ) , 'utf8' );
		
		tcpSocket.once( 'message', function( message ) {
			expect( _show( message ) ).toBe( 'X|Y|3+Z|Y|4+X|Y|5+' );
			done();
		} );
	} );

	it( 'concatenates the remained of the last incomplete message after buffer was exceeded', function( done ) {
		clientSocket.write( _msg( '+X|Y|7+' ) , 'utf8' );
		
		tcpSocket.once( 'message', function( message ) {
			expect( _show( message ) ).toBe( 'X|Y|6+X|Y|7+' );
			done();
		} );
	} );

	describe( 'on buffer overrun without valid message', function() {

		it( 'emits size exceeded message', function( done ) {
			clientSocket.write( _msg( 'X|Y|thismessageisgarbageanddonetooverrunthebuffer' ) , 'utf8' );
			clientSocket.once( 'data', function( packet ) {
				expect( packet.toString() ).toEqual( _msg( 'X|E|MAXIMUM_MESSAGE_SIZE_EXCEEDED|Received message longer than maxMessageSize+' ) );
				done();
			} );
		} );

		it( 'parses following messages correctly', function( done ) {
			clientSocket.write( _msg( 'stilloverun+X|Y|8+' ) , 'utf8' );
			tcpSocket.once( 'message', function( message ) {
				expect( _show( message ) ).toBe( 'stilloverun+X|Y|8+' );
				done();
			} );
		} );

	} );

	it( 'closes endpoint', function( done ) {
		tcpEndpoint.once( 'close', done );
		tcpEndpoint.close();
	} );

} );