export type AssetDef =
  | {
    type: "CEDEAR";
    underlyingTicker: string;
    ratio: number;
  }
  | {
    type: "ACCION_LOCAL";
  };

export const ASSET_DICTIONARY: Record<string, AssetDef> = {
  // CEDEARs
  "AAPL.BA": { type: "CEDEAR", underlyingTicker: "AAPL", ratio: 20 },
  "MSFT.BA": { type: "CEDEAR", underlyingTicker: "MSFT", ratio: 30 },
  "TSLA.BA": { type: "CEDEAR", underlyingTicker: "TSLA", ratio: 15 },
  "AAPL": { type: "CEDEAR", underlyingTicker: "AAPL", ratio: 1 },
  "MSFT": { type: "CEDEAR", underlyingTicker: "MSFT", ratio: 1 },
  "TSLA": { type: "CEDEAR", underlyingTicker: "TSLA", ratio: 1 },
  // Local stocks
  "GGAL.BA": { type: "ACCION_LOCAL" },
  "YPFD.BA": { type: "ACCION_LOCAL" },
  "MELI.BA": { type: "ACCION_LOCAL" },
  "MELI": { type: "ACCION_LOCAL" },
  "SAP": { type: "ACCION_LOCAL" },
};