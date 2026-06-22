/**
 * External dependencies
 */
import { registerPaymentMethod } from '@woocommerce/blocks-registry';
import { __ } from '@wordpress/i18n';
import { getSetting } from '@woocommerce/settings';
import { decodeEntities } from '@wordpress/html-entities';
import React, { useEffect, useState } from 'react';
import { applyFilters } from '@wordpress/hooks';

const settings = getSetting( 'mbway_ifthen_for_woocommerce_data', {} );
const defaultLabel = __(
	'MB WAY mobile payment',
	'multibanco-ifthen-software-gateway-for-woocommerce'
) + ' (ifthenpay)';
const label = decodeEntities( settings.title ) || defaultLabel;

/**
 * Content component
 *
 * @param {*} props Props from payment API.
 */
const Content = ( props ) => {
	/* Data to send to the server - https://github.com/woocommerce/woocommerce-blocks/blob/trunk/docs/internal-developers/block-client-apis/checkout/checkout-api.md#passing-a-value-from-the-client-through-to-server-side-payment-processing */
	const [ mbwayPhoneNumber, setMbwayPhoneNumber ] = useState( settings.default_number ); // This works but mbwayPhoneNumber is not available inside onPaymentSetup below
	const [ mbwayCountryCode, setMbwayCountryCode ] = useState( settings.default_country_code );
	const { eventRegistration, emitResponse }       = props;
	const { onPaymentSetup }                        = eventRegistration; // onPaymentProcessing deprecated - use onPaymentSetup instead
	useEffect( () => {
		const unsubscribe = onPaymentSetup( async () => {

			// Here we can do any processing we need, and then emit a response.
			// For example, we might validate a custom field, or perform an AJAX request, and then emit a response indicating it is valid or not.
			const mbway_ifthen_for_woocommerce_phone        = mbwayPhoneNumber; // This will need to be the value of the input field
			const mbway_ifthen_for_woocommerce_country_code = mbwayCountryCode; // This will need to be the value of the select field
			const customDataIsValid = (
				// If international is allowed and it's not PT, allow any number length
				settings.allow_international && mbway_ifthen_for_woocommerce_country_code !== 'PT'
			)
			||
			(
				// If international is not allowed or it's PT, number length must be 9 and start with 9
				mbway_ifthen_for_woocommerce_phone.length === 9
				&&
				mbway_ifthen_for_woocommerce_phone.charAt( 0 ) === '9'
			);

			if ( customDataIsValid ) {
				return {
					type: emitResponse.responseTypes.SUCCESS,
					meta: {
						paymentMethodData: applyFilters( 'mbway_ifthen_blocks_checkout_payment_data', {
							mbway_ifthen_for_woocommerce_phone,
							mbway_ifthen_for_woocommerce_country_code,
						} ),
					},
				};
			}

			return {
				type: emitResponse.responseTypes.ERROR,
				message: __(
					'Invalid MB WAY phone number',
					'multibanco-ifthen-software-gateway-for-woocommerce'
				),
			};
		} );
		// Unsubscribes when this component is unmounted.
		return () => {
			unsubscribe();
		};
	}, [
		emitResponse.responseTypes.ERROR,
		emitResponse.responseTypes.SUCCESS,
		onPaymentSetup,
		mbwayPhoneNumber,
		mbwayCountryCode
	] );

	/* Select value */
	const HandleMBWayCountryChange = ( event ) => {
		const value = event.target.value;
		setMbwayCountryCode( value );
		// If PT is selected, validate for Portuguese mobile number format
		const phoneInput = document.getElementById( settings.id + '_phone' );
		if ( phoneInput ) {
			if ( value === 'PT' ) {
				phoneInput.maxLength = 9;
			} else {
				phoneInput.maxLength = 99;
			}
		}
	};

	/* Input value */
	const HandleMBWayChange = ( event ) => {
		const value = event.target.value.replace( /\D/g, "" ); // Remove non-numeric characters
		setMbwayPhoneNumber( value );
	};

	/* Content */
	// Description
	var description = React.createElement( 'p', null, decodeEntities( settings.description || '' ) );
	// If international allowed, show prefix selector
	if ( settings.allow_international ) {
		// Convert object to array if needed
		const countryOptions = settings.country_code_options && typeof settings.country_code_options === 'object' 
			? Object.entries( settings.country_code_options ).map( ( [ countryCode, countryData ] ) => {
				return {
					code:    countryCode,
					display: countryData.display
				};
			})
			: [{ code: 'PT', value: '+351', display: 'Portugal (+351)' }];
		var countrycodeselect = React.createElement(
			'select',
			{
				name:      settings.id + '_country_code',
				id:        settings.id + '_country_code',
				className: 'wc-blocks-components-select__select',
				options:   countryOptions,
				required:  true,
				value:     mbwayCountryCode,
				onChange:  HandleMBWayCountryChange
			},
			// Map the transformed array to option elements
			countryOptions.map( country => 
				React.createElement(
					'option',
					{
						key: country.code,
						value: country.code
					},
					country.display
				)
			)
		);
		if ( settings.default_country_code === 'PT' ) {
			var maxInputLength = '9';
		} else {
			var maxInputLength = '99';
		}
	} else {
		var countrycodeselect = null;
		var maxInputLength    = '9';
	}

	// Input field
	var phonenumberinput = React.createElement( 'input', {
		type:         'tel',
		name:         settings.id + '_phone',
		id:           settings.id + '_phone',
		placeholder:  '9xxxxxxxx',
		autoComplete: 'off',
		maxLength:    maxInputLength,
		required:     true,
		value:        mbwayPhoneNumber,
		onChange:     HandleMBWayChange
	} );

	// Label inside field
	var phonenumberlabel = React.createElement( 'label', {
		htmlFor: settings.id + '_phone'
	}, decodeEntities( settings.phonenumbertext || '' ) );

	// Extend before phone number
	var beforePhoneNumber = applyFilters( 'mbway_ifthen_blocks_checkout_before_phone_number', null );

	// Country code selector
	if ( settings.allow_international ) {
		// Label inside field
		var countrycodelabel = React.createElement( 'label', {
			htmlFor:   settings.id + '_country_code',
			className: 'wc-blocks-components-select__label'
		}, __(
			'Country code',
			'multibanco-ifthen-software-gateway-for-woocommerce'
		) );
		// Select field
		var countrycode = React.createElement( 'div', {
			className: 'wc-blocks-components-select__container'
		}, '', countrycodelabel, countrycodeselect );
		var countrycode = React.createElement( 'div', {
			className: 'wc-blocks-components-select'
		}, '', countrycode );
	} else {
		var countrycode = null;
	}

	// Phone number: input + label
	var phonenumber = React.createElement( 'div', {
		className: 'wc-block-components-text-input is-active'
	}, '', phonenumberinput, phonenumberlabel );

	// Extend after phone number
	var afterPhoneNumber = applyFilters( 'mbway_ifthen_blocks_checkout_after_phone_number', null );
	
	// CSS
	if ( countrycode ) {
		var inlineStyles = `
			.mbway-ifthen-for-woocommerce-instructions-container {
				container-type: inline-size;
				container-name: mbway-ifthen-instructions-container;
				display: flex;
				flex-wrap: wrap;
				gap: 0 16px;
				justify-content: space-between;

			}
			.mbway-ifthen-for-woocommerce-instructions-container > * {
				flex: 0 0 100%;
			}
			.mbway-ifthen-for-woocommerce-instructions-container > :nth-child(2) { /* instructions */
				margin-bottom: 0px;
			}
			@container mbway-ifthen-instructions-container ( min-width: 450px ) {
				.mbway-ifthen-for-woocommerce-instructions-container > :nth-child(3), /* country code */
				.mbway-ifthen-for-woocommerce-instructions-container > :nth-child(4) { /* phone number */
					box-sizing: border-box;
					flex: 1 0 calc( 50% - 12px );
				}
			}
		`;
	} else {
		var inlineStyles = ``;
	}
	// Add a style tag to your component
	const styleTag = React.createElement( 'style', null, inlineStyles );

	// Return Content
	return React.createElement(
		'div',
		{
			className: 'mbway-ifthen-for-woocommerce-instructions-container'
		},
		styleTag,
		description,
		beforePhoneNumber,
		countrycode,
		phonenumber,
		afterPhoneNumber
	);
};

/**
 * Label component
 *
 * @param {*} props Props from payment API.
 */
const Label = ( props ) => {
	var icon = React.createElement( 'img', { src: settings.icon, width: settings.icon_width, height: settings.icon_height, style: { display: 'inline' } } );
	var span = React.createElement( 'span', { className: 'wc-block-components-payment-method-label wc-block-components-payment-method-label--with-icon' }, icon, decodeEntities( settings.title ) || defaultLabel );
	return span;
};


/**
 * CanMakePayment function
 *
 * @param checkoutData Checkout details.
 */
const CanMakePayment = ( checkoutData ) => {
	// Euro?
	if ( checkoutData.cartTotals.currency_code != 'EUR' ) {
		return false;
	}
	// Portugal?
	if ( settings.only_portugal ) {
		if ( checkoutData.billingData.country != 'PT' && checkoutData.shippingAddress.country != 'PT' ) {
			return false;
		}
	}
	// Minimum and maximum value
	var cart_total = checkoutData.cartTotals.total_price / 100; //It's return in cents (?)
	if ( settings.only_above ) {
		if ( cart_total < settings.only_above ) {
			return false;
		}
	}
	if ( settings.only_bellow ) {
		if ( cart_total > settings.only_bellow ) {
			return false;
		}
	}
	return true;
}

/**
 * MBWAY payment method config object.
 */
const ifthenpayMbWayPaymentMethod = {
	name:           'mbway_ifthen_for_woocommerce',
	label:          React.createElement( Label, null ),
	content:        React.createElement( Content, null ),
	edit:           React.createElement( Content, null ),
	icons:          null,
	canMakePayment: CanMakePayment,
	ariaLabel:      label,
	supports:       {
		features: settings.supports,
	},
};

registerPaymentMethod( ifthenpayMbWayPaymentMethod );
