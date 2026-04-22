import { Asset } from "../models/Asset";

export interface IAssetRepository {
  save(asset: Asset): Promise<void>;
  findById(id: string): Promise<Asset | null>;
  findByTicker(ticker: string): Promise<Asset | null>;
}
