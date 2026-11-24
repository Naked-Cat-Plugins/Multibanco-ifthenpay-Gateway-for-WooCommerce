<?php
/**
 * WooCommerce Subscriptions: real renewal and resubscribe orders do not get the payment details of the subscription.
 */
class SubscriptionsTest extends NakedCat_Tests_TestCase {

	/**
	 * Deprecated hooks used by the test.
	 *
	 * @var array
	 */
	private $deprecated = array();

	protected function setUp(): void {
		parent::setUp();
		if ( ! function_exists( 'wcs_create_subscription' ) ) {
			$this->markTestSkipped( 'WooCommerce Subscriptions is not active.' );
		}
		$this->deprecated = array();
		$this->add_test_filter(
			'deprecated_hook_run',
			function ( $hook ) {
				$this->deprecated[] = $hook;
			}
		);
		$this->add_test_filter( 'deprecated_hook_trigger_error', '__return_false' );
	}

	/**
	 * The payment methods.
	 *
	 * @return array
	 */
	private function methods() {
		$main = WC_IfthenPay_Webdados();
		return array( $main->multibanco_id, $main->mbway_id, $main->payshop_id, $main->creditcard_id, $main->gateway_ifthen_id );
	}

	/**
	 * A subscription with details of every payment method and data of another plugin.
	 *
	 * @param string $status The status.
	 * @return WC_Subscription
	 */
	private function subscription( $status ) {
		$user         = $this->make_user( 'customer' );
		$order        = $this->make_order( is_object( $user ) ? $user->ID : $user, array( $this->make_product( 12 ) ) );
		$subscription = wcs_create_subscription(
			array(
				'order_id'         => $order->get_id(),
				'customer_id'      => $order->get_customer_id(),
				'billing_period'   => 'month',
				'billing_interval' => 1,
			)
		);
		$this->assertNotInstanceOf( WP_Error::class, $subscription );
		$this->on_teardown(
			function () use ( $subscription ) {
				$subscription->delete( true );
			}
		);
		$subscription->add_product( $this->make_product( 12 ), 1 );
		foreach ( $this->methods() as $method ) {
			$subscription->update_meta_data( '_' . $method . '_val', '12' );
		}
		$subscription->update_meta_data( '_another_plugin', 'keep' );
		$subscription->set_billing_first_name( 'Ana' );
		$subscription->calculate_totals();
		$subscription->save();
		if ( 'cancelled' === $status ) {
			$subscription->update_status( 'active' );
			$subscription->update_status( 'cancelled' );
		}
		$this->deprecated = array();
		return wcs_get_subscription( $subscription->get_id() );
	}

	public static function copies() {
		return array(
			'renewal'     => array( 'wcs_create_renewal_order', 'active' ),
			'resubscribe' => array( 'wcs_create_resubscribe_order', 'cancelled' ),
		);
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'copies' )]
	public function test_payment_details_not_copied( $create, $status ) {
		$order = $create( $this->subscription( $status ) );
		$this->assertInstanceOf( WC_Order::class, $order );
		$this->on_teardown(
			function () use ( $order ) {
				$order->delete( true );
			}
		);
		$order = wc_get_order( $order->get_id() );
		foreach ( $this->methods() as $method ) {
			$this->assertSame( '', $order->get_meta( '_' . $method . '_val' ), $method );
		}
		$this->assertSame( 'keep', $order->get_meta( '_another_plugin' ), 'Other data is copied.' );
		$this->assertSame( 'Ana', $order->get_billing_first_name() );
		$this->assertNotContains( 'wcs_renewal_order_meta', $this->deprecated );
		$this->assertNotContains( 'wcs_resubscribe_order_meta', $this->deprecated );
	}

	/**
	 * The filter of Subscriptions below 4.7.
	 */
	public function test_old_filter() {
		$main = WC_IfthenPay_Webdados();
		$rows = array(
			array(
				'meta_key'   => '_' . $main->mbway_id . '_val',
				'meta_value' => '12',
			),
			array(
				'meta_key'   => '_another_plugin',
				'meta_value' => 'keep',
			),
		);
		$this->assertSame( array( '_another_plugin' ), array_column( $main->multibanco_wcs_filter_meta( $rows, null, null ), 'meta_key' ) );
		$this->assertFalse( has_filter( 'wcs_renewal_order_meta', array( $main, 'multibanco_wcs_filter_meta' ) ) );
		$this->assertFalse( has_filter( 'wcs_resubscribe_order_meta', array( $main, 'multibanco_wcs_filter_meta' ) ) );
	}
}
