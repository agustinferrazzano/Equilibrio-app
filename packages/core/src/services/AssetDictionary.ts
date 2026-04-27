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
  "AAPL.BA": { type: "CEDEAR", underlyingTicker: "AAPL", ratio: 20 },
  "MSFT.BA": { type: "CEDEAR", underlyingTicker: "MSFT", ratio: 30 },
  "TSLA.BA": { type: "CEDEAR", underlyingTicker: "TSLA", ratio: 15 },
  "GGAL.BA": { type: "ACCION_LOCAL" },
  "YPFD.BA": { type: "ACCION_LOCAL" },
};