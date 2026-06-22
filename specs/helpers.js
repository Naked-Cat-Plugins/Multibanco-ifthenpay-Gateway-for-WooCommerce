const BASE_URL             = process.env.WP_BASE_URL || 'https://wordpress.local';
const TEST_PRODUCT_ID      = process.env.TEST_PRODUCT_ID || '19191';
const CHECKOUT_BLOCKS_SLUG = 'checkout-blocks-2';

/**
 * Add a product to the WooCommerce cart via the Store API.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} productId
 * @param {number} quantity
 */
async function addToCart( page, productId = TEST_PRODUCT_ID, quantity = 1 ) {
	const nonce = await page.evaluate( async () => {
		const r = await fetch( '/wp-json/wc/store/v1/cart/nonce', {
			credentials: 'include',
		} ).catch( () => null );
		if ( r?.ok ) {
			const data = await r.json();
			return data.nonce;
		}
		return document.cookie
			.split( '; ' )
			.find( c => c.startsWith( 'woocommerce-store-api-nonce' ) )
			?.split( '=' )[ 1 ] || '';
	} );

	await page.evaluate(
		async ( { productId, quantity, nonce } ) => {
			await fetch( '/wp-json/wc/store/v1/cart/add-item', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'Nonce': nonce,
				},
				body: JSON.stringify( { id: Number( productId ), quantity } ),
			} );
		},
		{ productId, quantity, nonce }
	);
}

/**
 * Empty the cart via the Store API.
 *
 * @param {import('@playwright/test').Page} page
 */
async function emptyCart( page ) {
	const cartRes  = await page.request.get( `${ BASE_URL }/wp-json/wc/store/v1/cart` );
	const nonce    = cartRes.headers()[ 'x-wc-store-api-nonce' ] || '';
	const cartData = await cartRes.json();
	for ( const item of ( cartData.items || [] ) ) {
		await page.request.post( `${ BASE_URL }/wp-json/wc/store/v1/cart/remove-item`, {
			data: { key: item.key },
			headers: { Nonce: nonce },
		} );
	}
}

module.exports = {
	BASE_URL,
	TEST_PRODUCT_ID,
	CHECKOUT_BLOCKS_SLUG,
	addToCart,
	emptyCart,
};
