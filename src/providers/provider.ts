import { UTxO } from "@lucid-evolution/lucid";
import { OutRef } from "../types.js";

type Address = string;
type Asset = string;

type AssetAddress = {
  address: string;
  quantity: string;
};

type Provider = {
  findAllTokens: (policyId: string) => Promise<Address[]>;
  findToken: (tokenId: string) => Promise<Address>;
  findTokensOf: (policyId: string) => Promise<Asset[]>;
  getAssetAddresses: (
    assetId: string,
    parallel?: number
  ) => Promise<AssetAddress[]>;
  getConfirmations: (txHash: string) => Promise<number>;
  getHeight: () => Promise<number>;
  getStakedAddresses: (stakeKey: string) => Promise<Address[]>;
  getTokenHistory: (tokenId: string, limit: number) => Promise<OutRef[]>;
  getUtxos: (address: string, paginate?: boolean) => Promise<UTxO[]>;
  network: "mainnet" | "preprod" | "preview";
};

export default Provider;
