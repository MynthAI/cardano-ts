import C from "@anastasia-labs/cardano-multiplatform-lib-nodejs";
import { fromHex } from "@harmoniclabs/uint8array-utils";
import { mnemonicToEntropy } from "bip39";

type Network = "mainnet" | "testnet";

const getAccountKeyFromSeed = (seed: string) =>
  C.Bip32PrivateKey.from_bip39_entropy(
    fromHex(mnemonicToEntropy(seed)),
    new Uint8Array()
  )
    .derive(2147485500)
    .derive(2147485463)
    .derive(2147483648);

const getAddressFromSeed = (seed: string, network: Network = "mainnet") => {
  const accountKey = getAccountKeyFromSeed(seed);
  const paymentKey = accountKey.derive(0).derive(0).to_raw_key();
  const stakeKey = accountKey.derive(2).derive(0).to_raw_key();
  const paymentKeyHash = paymentKey.to_public().hash();
  const stakeKeyHash = stakeKey.to_public().hash();

  return C.BaseAddress.new(
    network == "mainnet" ? 1 : 0,
    C.Credential.new_pub_key(paymentKeyHash),
    C.Credential.new_pub_key(stakeKeyHash)
  )
    .to_address()
    .to_bech32(undefined);
};

const getPrivateKeyFromSeed = (
  seed: string,
  derivative: number = 0
): string => {
  const accountKey = getAccountKeyFromSeed(seed);
  return accountKey.derive(derivative).derive(0).to_raw_key().to_bech32();
};

class Seed {
  constructor(private phrase: string, private network: Network = "testnet") {}

  getAddress() {
    return getAddressFromSeed(this.phrase, this.network);
  }

  getPrivateKey() {
    return getPrivateKeyFromSeed(this.phrase);
  }

  getPrivateStakeKey() {
    return getPrivateKeyFromSeed(this.phrase, 2);
  }
}

export default Seed;
