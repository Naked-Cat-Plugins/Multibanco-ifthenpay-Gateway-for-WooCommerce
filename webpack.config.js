/**
 * The webpack.config.js file
 */

const path          = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const WooCommerceDependencyExtractionWebpackPlugin = require( '@woocommerce/dependency-extraction-webpack-plugin' );

module.exports = {
	...defaultConfig,
	entry: {
		'creditcard-block': path.resolve( process.cwd(), 'woocommerce-blocks', 'creditcard', 'src', 'index.js' ),
		'mbway-block': path.resolve( process.cwd(), 'woocommerce-blocks', 'mbway', 'src', 'index.js' ),
		'multibanco-block': path.resolve( process.cwd(), 'woocommerce-blocks', 'multibanco', 'src', 'index.js' ),
		'payshop-block': path.resolve( process.cwd(), 'woocommerce-blocks', 'payshop', 'src', 'index.js' ),
		'gateway-block': path.resolve( process.cwd(), 'woocommerce-blocks', 'gateway', 'src', 'index.js' )
	},
	output: {
		path: path.resolve( __dirname, 'woocommerce-blocks/build' ),
		filename: '[name].js'
	},
	// …snip
	plugins: [
		new WooCommerceDependencyExtractionWebpackPlugin()
	],
};