<?php
/**
 * The MB WAY country list has plain text names, for the block checkout.
 */
class CountryNamesTest extends NakedCat_Tests_TestCase {

	public function test_names_have_no_entities() {
		$this->set_option( 'woocommerce_allowed_countries', 'all' );
		$countries = WC_IfthenPay_Webdados::get_countries_with_phone_prefixes();
		$this->assertStringContainsString( 'ã', $countries['ST']['display'] );
		foreach ( $countries as $country ) {
			$this->assertDoesNotMatchRegularExpression( '/&[a-z0-9#]+;/i', $country['name'] . $country['display'] );
		}
	}
}
