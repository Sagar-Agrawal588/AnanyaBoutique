const buildProductNames = (products = []) =>
  Array.from(
    new Set(
      (Array.isArray(products) ? products : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

const shouldUseMonospaceValue = (value) => {
  const normalized = String(value || "").trim();
  return Boolean(normalized) && !/\s/.test(normalized);
};

const DetailCard = ({ label, value, monospace = false }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
      {label}
    </p>
    <p
      className={`mt-2 break-words text-sm font-medium text-gray-800 md:text-base ${
        monospace ? "font-mono" : ""
      }`}
    >
      {value}
    </p>
  </div>
);

const OrderDetailsOverview = ({
  productNames = [],
  orderIdLabel = "",
  purchaseTimestampLabel = "Purchase date and time",
  purchaseTimestampValue = "",
  paymentMethodLabel = "",
  paymentStatusLabel = "",
  orderStatusLabel = "",
  transactionReference = "",
  invoiceNumber = "",
  customerEmail = "",
}) => {
  const visibleProductNames = buildProductNames(productNames);
  const detailCards = [
    {
      label: "Order ID",
      value: orderIdLabel || "Not available",
      monospace: true,
    },
    {
      label: purchaseTimestampLabel,
      value: purchaseTimestampValue || "Not available",
    },
    {
      label: "Payment method",
      value: paymentMethodLabel || "Not available",
    },
    {
      label: "Payment status",
      value: paymentStatusLabel || "Not available",
    },
    {
      label: "Order status",
      value: orderStatusLabel || "Not available",
    },
    {
      label: "Payment reference",
      value: transactionReference || "Pending confirmation",
      monospace: shouldUseMonospaceValue(transactionReference),
    },
    {
      label: "Invoice number",
      value: invoiceNumber || "Generated after payment confirmation",
      monospace: shouldUseMonospaceValue(invoiceNumber),
    },
    {
      label: "Contact email",
      value: customerEmail || "Not available",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 md:p-6 mb-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800">
          Purchase Summary
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          A quick snapshot of your order, payment, and purchase details.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 md:col-span-2 xl:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Product names
          </p>
          {visibleProductNames.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleProductNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-medium text-gray-800">
              Product details will appear once the order items are available.
            </p>
          )}
        </div>

        {detailCards.map((item) => (
          <DetailCard
            key={item.label}
            label={item.label}
            value={item.value}
            monospace={item.monospace}
          />
        ))}
      </div>

    </div>
  );
};

export default OrderDetailsOverview;
