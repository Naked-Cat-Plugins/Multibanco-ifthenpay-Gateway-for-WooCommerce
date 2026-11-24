<?php
/**
 * Credit card and ifthenpay Gateway: the link to pay an unpaid order, in the emails WooCommerce really sends.
 */
class EmailPaymentLinkTest extends NakedCat_Tests_TestCase {

	/**
	 * Emails sent by the test.
	 *
	 * @var array
	 */
	private $mails = array();

	protected function setUp(): void {
		parent::setUp();
		$this->mails = array();
		$this->add_test_filter(
			'pre_wp_mail',
			function ( $pre, $atts ) {
				$this->mails[] = $atts;
				return true;
			},
			1,
			2
		);
		// The gateways add their email hooks when they are built
		WC()->payment_gateways();
	}

	/**
	 * The methods paid on the ifthenpay website.
	 */
	public static function methods() {
		return array(
			'Credit card'       => array( 'creditcard_ifthen_for_woocommerce', 'creditcard' ),
			'ifthenpay Gateway' => array( 'gateway_ifthen_ifthen_for_woocommerce', 'gateway' ),
		);
	}

	/**
	 * An unpaid order.
	 *
	 * @param string $method The payment method.
	 * @param string $status The status.
	 * @return WC_Order
	 */
	private function unpaid_order( $method, $status = 'on-hold' ) {
		$order = $this->make_order( 0, array( $this->make_product( 12 ) ) );
		$order->set_payment_method( $method );
		$order->set_billing_email( 'customer@example.com' );
		$order->set_status( $status );
		$order->calculate_totals();
		$order->save();
		$this->mails = array();
		return wc_get_order( $order->get_id() );
	}

	/**
	 * Send a WooCommerce email and get its body.
	 *
	 * @param string   $email The email class.
	 * @param WC_Order $order The order.
	 * @param string   $type  html or plain.
	 * @return string
	 */
	private function send( $email, $order, $type = 'html' ) {
		$emails = WC()->mailer()->get_emails();
		$this->assertArrayHasKey( $email, $emails );
		$this->set_property( $emails[ $email ], 'email_type', $type );
		$this->set_property( $emails[ $email ], 'enabled', 'yes' );
		if ( 'WC_Email_Customer_Note' === $email ) {
			$emails[ $email ]->trigger(
				array(
					'order_id'      => $order->get_id(),
					'customer_note' => 'A note.',
				)
			);
		} else {
			$emails[ $email ]->trigger( $order->get_id(), $order );
		}
		$this->assertCount( 1, $this->mails, 'One email was sent.' );
		return (string) $this->mails[0]['message'];
	}

	/**
	 * How many times the pay page is linked in an email.
	 *
	 * @param string   $body  The email.
	 * @param WC_Order $order The order.
	 * @return int
	 */
	private function links( $body, $order ) {
		return substr_count( html_entity_decode( $body ), html_entity_decode( $order->get_checkout_payment_url() ) );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_on_hold_email( $method, $prefix ) {
		$order = $this->unpaid_order( $method );
		$body  = $this->send( 'WC_Email_Customer_On_Hold_Order', $order );
		$this->assertSame( 1, $this->links( $body, $order ) );
		$this->assertStringContainsString( 'Payment instructions', $body );
		$this->assertStringContainsString( 'If you have not completed the payment yet', $body );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_on_hold_email_plain_text( $method, $prefix ) {
		$order = $this->unpaid_order( $method );
		$body  = $this->send( 'WC_Email_Customer_On_Hold_Order', $order, 'plain' );
		$this->assertSame( 1, $this->links( $body, $order ) );
		$this->assertStringContainsString( 'If you have not completed the payment yet', $body );
		$this->assertStringNotContainsString( '<table', $body );
		$this->assertStringNotContainsString( '&#038;', $body, 'The address can be copied as it is.' );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_failed_email( $method, $prefix ) {
		$order = $this->unpaid_order( $method, 'failed' );
		$this->assertSame( 1, $this->links( $this->send( 'WC_Email_Customer_Failed_Order', $order ), $order ) );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_customer_note_email( $method, $prefix ) {
		$order = $this->unpaid_order( $method, 'pending' );
		$this->assertSame( 1, $this->links( $this->send( 'WC_Email_Customer_Note', $order ), $order ) );
	}

	/**
	 * "Order details" has its own link: the card recovery of the PRO add-on sends it.
	 */
	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_order_details_email_has_only_its_own_link( $method, $prefix ) {
		$order = $this->unpaid_order( $method, 'pending' );
		$body  = $this->send( 'WC_Email_Customer_Invoice', $order );
		$this->assertSame( 1, $this->links( $body, $order ) );
		$this->assertStringNotContainsString( 'If you have not completed the payment yet', $body );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_admin_email_has_no_link( $method, $prefix ) {
		$gateway = WC()->payment_gateways()->payment_gateways()[ $method ];
		$this->set_property( $gateway, 'send_to_admin', true );
		$this->add_test_filter( 'woocommerce_new_order_email_allows_resend', '__return_true' );
		$order = $this->unpaid_order( $method );
		$this->assertSame( 0, $this->links( $this->send( 'WC_Email_New_Order', $order ), $order ) );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_paid_and_cancelled_orders_have_no_link( $method, $prefix ) {
		// The payment received message needs the payment details of a real payment
		$this->add_test_filter( $prefix . '_ifthen_email_instructions_payment_received_send', '__return_false' );
		$order = $this->unpaid_order( $method, 'processing' );
		$this->assertSame( 0, $this->links( $this->send( 'WC_Email_Customer_Processing_Order', $order ), $order ) );
		$order = $this->unpaid_order( $method, 'cancelled' );
		$this->assertSame( 0, $this->links( $this->send( 'WC_Email_Customer_Note', $order ), $order ) );
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'methods' )]
	public function test_filters( $method, $prefix ) {
		$order = $this->unpaid_order( $method );
		$this->add_test_filter( $prefix . '_ifthen_email_instructions_table_html', fn( $html, $total, $order_id ) => 'CUSTOM ' . $total . ' ' . $order_id, 10, 3 );
		$this->assertStringContainsString( 'CUSTOM 12 ' . $order->get_id(), $this->send( 'WC_Email_Customer_On_Hold_Order', $order ) );
		$this->mails = array();
		$this->add_test_filter( $prefix . '_ifthen_email_instructions_pending_send', '__return_false' );
		$this->assertStringNotContainsString( 'CUSTOM', $this->send( 'WC_Email_Customer_On_Hold_Order', $order ) );
	}

	/**
	 * Other methods are not changed.
	 */
	public function test_other_methods_have_no_link() {
		$order = $this->unpaid_order( 'bacs' );
		$this->assertSame( 0, $this->links( $this->send( 'WC_Email_Customer_On_Hold_Order', $order ), $order ) );
	}

	/**
	 * A subscription is not paid on the pay page.
	 */
	public function test_subscription_has_no_link() {
		if ( ! class_exists( 'WC_Subscription' ) ) {
			$this->markTestSkipped( 'WooCommerce Subscriptions is not active.' );
		}
		$this->assertFalse( WC_IfthenPay_Webdados()->email_needs_payment_link( $this->createStub( WC_Subscription::class ), false ) );
	}
}
