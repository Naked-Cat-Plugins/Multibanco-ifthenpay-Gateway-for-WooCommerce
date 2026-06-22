/**
 * Tests for the block-based payment method integrations.
 *
 * Covers:
 *  - No "accessed wc.wcBlocksRegistry without declaring wc-blocks-registry"
 *    or "accessed wc.wcSettings without declaring wc-settings" console warnings
 *    for any ifthenpay payment method script on the blocks checkout page.
 */

const { test, expect } = require('@playwright/test');
const { BASE_URL, CHECKOUT_BLOCKS_SLUG, addToCart, emptyCart } = require('./helpers');

// Pattern WooCommerce emits when a script uses wc.wcBlocksRegistry / wc.wcSettings
// without declaring the dependency in its registration.
const DEPENDENCY_WARNING_RE = /accessed wc\.(wcBlocksRegistry|wcSettings) without declaring/;

test.describe( 'Block checkout — ifthenpay payment methods', () => {

	test.beforeEach( async ( { page } ) => {
		// Start from a clean page so the Store API nonce endpoint is reachable
		await page.goto( `${ BASE_URL }/` );
		await addToCart( page );
	} );

	test.afterEach( async ( { page } ) => {
		await emptyCart( page );
	} );

	test( 'no wc-blocks-registry / wc-settings dependency warnings', async ( { page } ) => {
		const warnings = [];

		page.on( 'console', msg => {
			if ( msg.type() === 'warning' ) {
				const text = msg.text();
				if ( DEPENDENCY_WARNING_RE.test( text ) && text.includes( 'ifthenpay' ) ) {
					warnings.push( text );
				}
			}
		} );

		await page.goto( `${ BASE_URL }/${ CHECKOUT_BLOCKS_SLUG }/` );
		await page.waitForSelector( '.wp-block-woocommerce-checkout', { timeout: 15_000 } );
		// Allow all deferred scripts to execute
		await page.waitForTimeout( 2_000 );

		expect(
			warnings,
			`Unexpected dependency warnings:\n${ warnings.join( '\n' ) }`
		).toHaveLength( 0 );
	} );

	test( 'payment method list renders at least one ifthenpay option', async ( { page } ) => {
		await page.goto( `${ BASE_URL }/${ CHECKOUT_BLOCKS_SLUG }/` );
		await page.waitForSelector( '.wp-block-woocommerce-checkout', { timeout: 15_000 } );

		// At least one ifthenpay radio option should be visible in the payment step
		const paymentOptions = page.locator( '.wc-block-components-radio-control__option' );
		await expect( paymentOptions.first() ).toBeVisible( { timeout: 10_000 } );

		const labels = await paymentOptions.allTextContents();
		const hasIfthenpay = labels.some( l =>
			/(Multibanco|MB WAY|Cartão|Credit|Cofidis|Payshop|ifthenpay)/i.test( l )
		);
		expect( hasIfthenpay, `Expected at least one ifthenpay payment option. Found: ${ labels.join(', ') }` ).toBe( true );
	} );

} );
