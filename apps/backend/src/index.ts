import { Asset } from "@equilibrio/core";

const sampleAsset = new Asset("1", "AAPL", "Apple Inc.", "STOCK", 1);

console.log("Backend initialized with sample asset:", sampleAsset.ticker);
