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

const getAddressFromSeed = (
  seed: string,
  network: Network = "mainnet",
  index: number = 0,
  includeStakeKey: boolean = true
) => {
  const accountKey = getAccountKeyFromSeed(seed);
  const paymentKey = accountKey.derive(0).derive(index).to_raw_key();
  const stakeKey = accountKey.derive(2).derive(index).to_raw_key();
  const paymentKeyHash = paymentKey.to_public().hash();
  const stakeKeyHash = stakeKey.to_public().hash();

  if (includeStakeKey)
    return C.BaseAddress.new(
      network == "mainnet" ? 1 : 0,
      C.Credential.new_pub_key(paymentKeyHash),
      C.Credential.new_pub_key(stakeKeyHash)
    )
      .to_address()
      .to_bech32(undefined);

  return C.EnterpriseAddress.new(
    network == "mainnet" ? 1 : 0,
    C.Credential.new_pub_key(paymentKeyHash)
  )
    .to_address()
    .to_bech32(undefined);
};

const getPrivateKeyFromSeed = (
  seed: string,
  derivative: number = 0,
  index: number = 0
): string => {
  const accountKey = getAccountKeyFromSeed(seed);
  return accountKey.derive(derivative).derive(index).to_raw_key().to_bech32();
};

class Seed {
  private index: number = 0;

  constructor(private phrase: string, private network: Network = "testnet") {}

  next() {
    this.index++;
  }

  getAddress(includeStakeKey: boolean = true) {
    return getAddressFromSeed(
      this.phrase,
      this.network,
      this.index,
      includeStakeKey
    );
  }

  getPrivateKey() {
    return getPrivateKeyFromSeed(this.phrase, 0, this.index);
  }

  getPrivateStakeKey() {
    return getPrivateKeyFromSeed(this.phrase, 2, this.index);
  }
}

export default Seed;
