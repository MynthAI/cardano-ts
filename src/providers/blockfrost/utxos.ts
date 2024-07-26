import { BlockFrostAPI } from "@blockfrost/blockfrost-js";
import { components } from "@blockfrost/openapi";
import { UTxO } from "@lucid-evolution/lucid";
import { LimitFunction } from "p-limit";
import { fetchWithFallback } from "./utils.js";

type ElementType<T> = T extends (infer U)[] ? U : never;
type BlockfrostUtxo = ElementType<
  components["schemas"]["address_utxo_content"]
>;

const getAddressUtxos = async (
  blockfrost: BlockFrostAPI,
  address: string,
  limit: LimitFunction
): Promise<UTxO[]> => {
  const utxos = await fetchWithFallback(
    () => blockfrost.addressesUtxos(address),
    []
  );

  return await Promise.all(
    utxos.map((utxo) => toUtxo(utxo, blockfrost, limit))
  );
};

const toUtxo = async (
  utxo: BlockfrostUtxo,
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

export { getAddressUtxos };
