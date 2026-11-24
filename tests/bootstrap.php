<?php
/**
 * PHPUnit bootstrap: the shared Naked Cat Plugins test library does the work.
 */

$mbifthen_tests_lib = getenv( 'NAKEDCAT_TESTS_LIB' );
if ( ! $mbifthen_tests_lib || ! file_exists( $mbifthen_tests_lib . '/php/bootstrap.php' ) ) {
	fwrite( STDERR, "The nakedcat-plugin-tests library was not found. Set NAKEDCAT_TESTS_LIB.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite
	exit( 1 );
}
require $mbifthen_tests_lib . '/php/bootstrap.php';
