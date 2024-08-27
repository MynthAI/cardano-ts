import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { UTxO } from "@lucid-evolution/lucid";
import { LimitFunction } from "p-limit";
import { fetchWithFallback } from "./utils.js";

const getAddressUtxos = async (
  blockfrost: BlockFrostAPI,
  address: string,
  limit: LimitFunction
): Promise<UTxO[]> =>
  await Promise.all(
    (
      await queryUtxos(blockfrost, address, limit)
    ).map((utxo) => toUtxo(utxo, blockfrost, limit))
  );

const getTransactionUtxos = async (
  blockfrost: BlockFrostAPI,
  txHash: string,
  limit: LimitFunction
): Promise<UTxO[]> => {
  const utxos =
    (
      await fetchWithFallback(
        () => limit(() => blockfrost.txsUtxos(txHash)),
        undefined
      )
    )?.outputs || [];
  return Promise.all(
    utxos.map((utxo) => toUtxo({ ...utxo, tx_hash: txHash }, blockfrost, limit))
  );
};

const queryUtxos = async (
  blockfrost: BlockFrostAPI,
  address: string,
  limit: LimitFunction
) => {
  type BlockfrostUtxo = Awaited<
    ReturnType<typeof blockfrost.addressesUtxos>
  >[number];
  const utxos: BlockfrostUtxo[] = [];

  for (let page = 1; ; page++) {
    const result = await fetchWithFallback(
      () => limit(() => blockfrost.addressesUtxos(address, { page })),
      []
    );
    utxos.push(...result);
    if (result.length < 100) return utxos;
  }
};

type UtxoStructure = {
  tx_hash: string;
  output_index: number;
  amount: Array<{ unit: string; quantity: string }>;
  address: string;
  inline_datum?: string | null;
  data_hash?: string | null;
  reference_script_hash?: string | null;
};

const toUtxo = async (
  utxo: UtxoStructure,
  blockfrost: BlockFrostAPI,
  limit: LimitFunction
): Promise<UTxO> => {
  const ref: UTxO = {
    txHash: utxo.tx_hash,
    outputIndex: utxo.output_index,
    assets: Object.fromEntries(
      utxo.amount.map(({ unit, quantity }) => [unit, BigInt(quantity)])
    ),
    address: utxo.address,
    datumHash: (!utxo.inline_datum && utxo.data_hash) || undefined,
    datum: utxo.inline_datum || undefined,
    scriptRef: undefined,
  };

  if (!utxo.reference_script_hash) return ref;
  const scriptHash = utxo.reference_script_hash;

  const script = await limit(() => blockfrost.scriptsByHash(scriptHash));
  if (script.type == "timelock") return ref;

  const scriptData = await limit(() => blockfrost.scriptsCbor(scriptHash));
  if (!scriptData.cbor) return ref;

  ref.scriptRef = {
    type: script.type == "plutusV1" ? "PlutusV1" : "PlutusV2",
    script: scriptData.cbor, // TODO: consider double cbor
  };

  return ref;
};

export { getAddressUtxos, getTransactionUtxos };
