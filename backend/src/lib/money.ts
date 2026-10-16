// "UGX 165,000". Amounts are whole units of the currency.
export const formatMoney = (amount: number, currency: string) => `${currency} ${amount.toLocaleString("en-US")}`;
