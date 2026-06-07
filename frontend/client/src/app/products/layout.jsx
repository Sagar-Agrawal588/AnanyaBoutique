export const metadata = {
  title: "Discover Your Style | Ananya Boutique",
  description:
    "Fashion, beauty, and accessories curated with love since 2012.",
};

// src/app/products/layout.jsx
export default function ProductsLayout({ children }) {
  return <section className="overflow-x-hidden">{children}</section>;
}
