import C from "@anastasia-labs/cardano-multiplatform-lib-nodejs";
import { Address, CredentialType } from "@harmoniclabs/plu-ts";
import { UTxO } from "@lucid-evolution/lucid";
import invariant from "./invariant.js";
import Provider from "./providers/provider.js";
import Seed from "./seed.js";

const getAccountUtxos = async (
  provider: Provider,
  stakeKey: string
): Promise<UTxO[]> => {
  const addresses = await provider.getStakedAddresses(stakeKey);

  return (
    await Promise.all(
      addresses.map(async (address) => {
        // Ignore script addresses
        if (
          Address.fromString(address).paymentCreds.type ===
          CredentialType.Script
        )
          return [];

        return provider.getUtxos(address);
      })
    )
  ).flat();
};

class Wallet {
  constructor(public readonly address: string, public readonly utxos: UTxO[]) {}

  static async fromAddress(provider: Provider, address: string) {
    const parsedAddress = C.BaseAddress.from_address(
      C.Address.from_bech32(address)
    );
    invariant(parsedAddress, "Invalid address");
    const pubKey = parsedAddress.stake().as_pub_key();
    invariant(pubKey, "No stake key attached to address");
    const stake = C.RewardAddress.new(
      provider.network == "mainnet" ? 1 : 0,
      C.Credential.new_pub_key(C.Ed25519KeyHash.from_hex(pubKey.to_hex()))
    )
      .to_address()
      .to_bech32(undefined);

    const utxos = await getAccountUtxos(provider, stake);

    return new Wallet(address, utxos);
  }

  static fromSeed(provider: Provider, phrase: string) {
    const address = new Seed(
      phrase,
      provider.network == "mainnet" ? "mainnet" : "testnet"
    ).getAddress();
    return Wallet.fromAddress(provider, address);
  }
}

export default Wallet;
export { getAccountUtxos }; // TODO: Remove after bug is fixed
