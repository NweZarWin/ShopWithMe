import { formatMoney } from "../utils/money"

export function PaymentSummary({
    paymentSummary,
    onPlaceOrder,
    paymentMethod,
    onPaymentMethodChange,
    isPlacingOrder,
    placeOrderError,
    selectedItemsCount
}) {
    return (
    <div className="payment-summary">
        <div className="payment-summary-title">
            Payment Summary
        </div>

        {selectedItemsCount === 0 && (
            <p className="payment-summary-hint" role="status">
                Select at least one cart item to continue.
            </p>
        )}

        <div className="payment-summary-row">
            <div>Selected items ({paymentSummary.totalItems}):</div>
            <div className="payment-summary-money">
                {formatMoney(paymentSummary.productCostCents)}
            </div>
        </div>

        <div className="payment-summary-row">
            <div>Shipping &amp; handling:</div>
            <div className="payment-summary-money">
                {formatMoney(paymentSummary.shippingCostCents)}
            </div>
        </div>

        <div className="payment-summary-row subtotal-row">
            <div>Total before tax:</div>
            <div className="payment-summary-money">
                {formatMoney(paymentSummary.totalCostBeforeTaxCents)}
            </div>
        </div>

        <div className="payment-summary-row">
            <div>Estimated tax (10%):</div>
            <div className="payment-summary-money">
                {formatMoney(paymentSummary.taxCents)}
            </div>
        </div>

        <div className="payment-summary-row total-row">
            <div>Order total:</div>
            <div className="payment-summary-money">
                {formatMoney(paymentSummary.totalCostCents)}
            </div>
        </div>

        <div className="payment-method-summary">
            <strong>Payment method:</strong>
            <label className="payment-method-option">
                <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_hand"
                    checked={paymentMethod === 'cash_on_hand'}
                    onChange={() => onPaymentMethodChange('cash_on_hand')}
                />
                <span>
                    <strong>Cash on delivery (COD)</strong>
                    <small>Pay in cash when your order is delivered.</small>
                </span>
            </label>
        </div>

        {placeOrderError && <p role="alert">{placeOrderError}</p>}

        <button
            className="place-order-button button-primary"
            onClick={onPlaceOrder}
            disabled={
                selectedItemsCount === 0 ||
                !paymentMethod ||
                isPlacingOrder
            }
        >
            {isPlacingOrder ? 'Placing order...' : 'Place your order'}
        </button>
    </div>
    );
}