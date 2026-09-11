/**
 * Ferbil Interfreight Limited - the trading entity on customer-facing
 * documents (invoices, quotations). Kept in one place so the proforma
 * invoice here and any future final/taxed invoice stay identical.
 */
export const COMPANY = {
  name: "Ferbil Interfreight Limited",
  poBox: "P.O Box 95034-00100",
  addressLines: ["Olemonana House, 2nd Floor", "Moi Avenue, Mombasa", "Mombasa, Kenya"],
  phone: "+254 726 991 028",
  email: "info@ferbil.co.ke",
  web: "www.ferbil.co.ke",
} as const;

/** NCBA USD account - where invoice payments are settled. */
export const BANK_DETAILS: { label: string; value: string }[] = [
  { label: "Account type", value: "USD Account" },
  { label: "Bank name", value: "NCBA" },
  { label: "Branch", value: "Tatu City" },
  { label: "Account name", value: "FERBIL INTERFREIGHT LIMITED" },
  { label: "Account number", value: "1001635557" },
  { label: "SWIFT code", value: "CBAFKENX" },
  { label: "Branch code", value: "236" },
];
