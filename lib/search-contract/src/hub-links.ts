/**
 * Canonical SEO hub quick-link query strings (W2 golden fixtures).
 * Shared by golden tests and documentation — must match banco-web hub pages.
 */
export const GOLDEN_HUB_QUERIES = [
  {
    label: "cars all",
    query: "category=car",
    expect: { category: "car" },
  },
  {
    label: "cars new",
    query: "category=car&engine=new",
    expect: { category: "car", condition: "new" },
  },
  {
    label: "cars bank",
    query: "category=car&engine=bank",
    expect: { category: "car", payment_plan: "bank" },
  },
  {
    label: "real estate rent",
    query: "category=real_estate&engine=rent",
    expect: { category: "real_estate", offer_type: "rent" },
  },
  {
    label: "real estate new-law rent",
    query: "category=real_estate&engine=rent&rental_term=new_law",
    expect: {
      category: "real_estate",
      offer_type: "rent",
      rental_term: "new_law",
    },
  },
  {
    label: "facilities factory",
    query: "category=facilities&industrial_type=factory",
    expect: { category: "industrial", industrial_type: "factory" },
  },
  {
    label: "installment filter",
    query: "category=car&payment_type=installment",
    expect: { category: "car", has_installment: true },
  },
] as const;

export const ENGINE_HUB_QUERIES = [
  { label: "car new", query: "category=car&engine=new", engineKey: "new" },
  { label: "car bank", query: "category=car&engine=bank", engineKey: "bank" },
  { label: "re rent", query: "category=real_estate&engine=rent", engineKey: "rent" },
  { label: "re sale", query: "category=real_estate&engine=sale", engineKey: "sale" },
  {
    label: "installment",
    query: "category=car&payment_type=installment",
    engineKey: "all",
  },
] as const;
