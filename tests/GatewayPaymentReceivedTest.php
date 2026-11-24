<?php
/**
 * ifthenpay Gateway: the payment received message, with and without the details of a payment.
 */
class GatewayPaymentReceivedTest extends NakedCat_Tests_TestCase {

	/**
	 * An order paid with the ifthenpay Gateway.
	 *
	 * @param array $details Payment details.
	 * @return WC_Order
	 */
	private function paid_order( $details ) {
		$order = $this->make_order( 0, array( $this->make_product( 12 ) ) );
		$order->set_payment_method( WC_IfthenPay_Webdados()->gateway_ifthen_id );
		foreach ( $details as $key => $value ) {
			$order->update_meta_data( '_' . WC_IfthenPay_Webdados()->gateway_ifthen_id . '_' . $key, $value );
		}
		$order->set_status( 'processing' );
		$order->save();
		return wc_get_order( $order->get_id() );
	}

	public static function cases() {
		$started = array(
			'gatewaykey' => 'AAAA-000000',
			'pincode'    => '1',
			'id'         => '1',
			'val'        => '12',
		);
		return array(
			'set as paid, no details'  => array( array(), 'ifthenpay Gateway payment received.', false ),
			'started, then set as paid' => array( $started, 'ifthenpay Gateway payment received.', false ),
			'paid with Apple Pay'      => array(
				$started + array(
					'payment_method' => 'APPLE',
					'request_id'     => '1',
				),
				'ifthenpay Apple payment received.',
				true,
			),
		);
	}

	#[\PHPUnit\Framework\Attributes\DataProvider( 'cases' )]
	public function test_message( $details, $message, $can_refund ) {
		$order   = $this->paid_order( $details );
		$gateway = WC()->payment_gateways()->payment_gateways()[ WC_IfthenPay_Webdados()->gateway_ifthen_id ];
		ob_start();
		$gateway->email_instructions_1( $order, false, false );
		$this->assertStringContainsString( $message, ob_get_clean() );
		$this->set_property( $gateway, 'supports', array( 'products', 'refunds' ) );
		$this->assertSame( $can_refund, (bool) $gateway->can_refund_order( $order ) );
	}
}
