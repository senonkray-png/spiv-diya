// Payment integrations (no FOP/legal entity required)

export interface CryptoInvoice {
  address: string;
  amountUSDT: number;
  expiresAt: string;
  orderId: string;
}

// Binance Pay — merchant API (requires Binance merchant account, not FOP)
export async function createBinanceInvoice(
  amountUSD: number,
  orderId: string
): Promise<CryptoInvoice> {
  const res = await fetch("https://bpay.binanceapi.com/binancepay/openapi/v2/order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "BinancePay-Timestamp": Date.now().toString(),
      "BinancePay-Nonce": crypto.randomUUID(),
      "BinancePay-Certificate-SN": process.env.BINANCE_CERT_SN!,
      "BinancePay-Signature": "", // TODO: HMAC-SHA512
    },
    body: JSON.stringify({
      env: { terminalType: "WEB" },
      merchantTradeNo: orderId,
      orderAmount: amountUSD.toFixed(2),
      currency: "USDT",
      description: "СпівДія balance top-up",
    }),
  });
  const data = await res.json();
  return {
    address: data.data?.checkoutUrl,
    amountUSDT: amountUSD,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    orderId,
  };
}

// WhiteBit Pay — alternative crypto gateway
export async function createWhitebitInvoice(
  amountUSD: number,
  orderId: string
): Promise<CryptoInvoice> {
  const res = await fetch("https://whitebit.com/api/v4/external/invoices/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker: "USDT",
      amount: amountUSD.toString(),
      order_id: orderId,
      description: "СпівДія balance top-up",
      api_key: process.env.WHITEBIT_API_KEY,
      // signature added server-side
    }),
  });
  const data = await res.json();
  return {
    address: data.address,
    amountUSDT: amountUSD,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    orderId,
  };
}

// P2P links for Monobank/Privat24 — semi-automatic (screenshot confirmation)
export function getP2PLink(bank: "mono" | "privat", cardNumber: string, amount: number) {
  if (bank === "mono") {
    return `https://send.monobank.ua/jar/${process.env.MONO_JAR_ID}?amount=${amount * 100}`;
  }
  return `https://next.privat24.ua/send/card?card=${cardNumber}&amount=${amount}`;
}
