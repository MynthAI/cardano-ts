import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import limit, { LimitFunction } from "p-limit";
import invariant from "../../invariant.js";
import Provider from "../provider.js";
import paginate from "./paginate.js";
import * as tokens from "./tokens.js";
import { fetchWithFallback } from "./utils.js";
import { getAddressUtxos } from "./utxos.js";

class Blockfrost implements Provider {
  readonly network: "mainnet" | "preprod" | "preview";
  private blockfrost: BlockFrostAPI;
  private limit: LimitFunction;

  constructor(projectId: string, private parallel: number = 20) {
    const network = projectId.substring(0, 7);
    invariant(
      network == "mainnet" || network == "preprod" || network == "preview",
      "Unknown network"
    );
    this.network = network;
    this.blockfrost = new BlockFrostAPI({ projectId });
    this.limit = limit(parallel);
  }

  findAllTokens(policyId: string): Promise<string[]> {
    // Policies typically don't have many tokens, so don't
    // load multiple pages since that'll only slow down the
    // results
    return tokens.findAll(this.blockfrost, policyId, this.limit, 1);
  }

  async findTokensOf(policyId: string): Promise<string[]> {
    return (
      await tokens.findOfPolicy(this.blockfrost, policyId, this.limit, 1)
    ).map(({ asset }) => asset);
  }

  async findToken(tokenId: string): Promise<string> {
    const addresses = await tokens.find(this.blockfrost, tokenId, this.limit);
    invariant(addresses.length > 0, "Token not found");
    invariant(
      addresses.length == 1 && parseInt(addresses[0].quantity) == 1,
      "There's more than one token"
    );

    return addresses[0].address;
  }

  getUtxos(address: string, paginate?: boolean) {
    // Addresses typically don't have many UTXOs, so don't
    // load multiple pages since that'll only slow down the
    // results
    return getAddressUtxos(this.blockfrost, address, this.limit, 1, !!paginate);
  }

  async getHeight() {
    const latestBlock = await fetchWithFallback(
      () => this.blockfrost.blocksLatest(),
      null
    );
    invariant(latestBlock?.height, "Latest block information not found");
    return latestBlock.height;
  }

  async getConfirmations(txHash: string, height: number = 0) {
    const tx = await fetchWithFallback(() => this.blockfrost.txs(txHash), null);
    invariant(tx, `Transaction with hash ${txHash} not found`);

    if (!height) height = await this.getHeight();
    return height - tx.block_height + 1;
  }

  async getAssetAddresses(assetId: string) {
    return paginate(
      (page) => this.blockfrost.assetsAddresses(assetId, { page }),
      this.limit,
      this.parallel
    );
  }

  async getStakedAddresses(stakeKey: string) {
    return (
      await paginate(
        (page) => this.blockfrost.accountsAddresses(stakeKey, { page }),
        this.limit,
        this.parallel
      )
    ).map((result) => result.address);
  }

  async getTokenHistory(tokenId: string, limit: number) {
    const txs = [];
    let page = 1;

    while (txs.length < limit) {
      const batch = await this.limit(() =>
        fetchWithFallback(
          () =>
            this.blockfrost.assetsTransactions(tokenId, {
              page: page++,
              order: "desc",
            }),
          []
        )
      );

      if (!batch.length) break;

      txs.push(...batch);
    }

    return txs
      .slice(0, limit)
      .map((tx) => ({ txHash: tx.tx_hash, outputIndex: tx.tx_index }));
  }
}

export default Blockfrost;
