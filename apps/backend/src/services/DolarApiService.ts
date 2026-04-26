import { ICurrencyService } from "@equilibrio/core";

export class DolarApiService implements ICurrencyService {
  async getExchangeRate(currencyPair: string): Promise<number | null> {
    if (currencyPair !== "USDARS_MEP") {
      return null;
    }

    try {
      const response = await fetch("https://dolarapi.com/v1/dolares");

      if (!response.ok) {
        console.error(`DolarAPI error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as Array<{ casa?: string; venta?: unknown }>;

      if (!Array.isArray(data)) {
        console.error("DolarAPI: Unexpected response format");
        return null;
      }

      // Buscar la cotización de Contado con Liquidación (MEP)
      const mepRate = data.find((item) => item.casa === "contadoconliqui");

      if (!mepRate || typeof mepRate.venta !== "number" || !Number.isFinite(mepRate.venta)) {
        console.warn("DolarAPI: MEP rate not found or invalid");
        return null;
      }

      console.log(`DolarAPI: MEP rate fetched successfully: ${mepRate.venta}`);
      return mepRate.venta;
    } catch (error) {
      console.error("DolarAPI fetch error:", error instanceof Error ? error.message : String(error));
      return null;
    }
  }
}
