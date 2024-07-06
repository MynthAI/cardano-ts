import { createHash, randomBytes } from "crypto";
import { Blockfrost } from "@cardano-ts/node";
import { test } from "supertape";

const projectId = process.env["BLOCKFROST_API_KEY"] || "";

if (!projectId) {
  console.error("BLOCKFROST_API_KEY must be set");
  process.exit(1);
}

const rand = () => createHash("sha256").update(randomBytes(32)).digest("hex");

const blockfrost = new Blockfrost(projectId);

test("blockfrost: findToken throws error for non-existent token", async (t) => {
  const token = rand()[64] + rand();

  try {
    await blockfrost.findToken(token);
    t.fail("Found non-existent token");
  } catch {
    t.pass("Could not find token");
  }

  t.end();
});

test("blockfrost: findToken returns correct address", async (t) => {
  const address = await blockfrost.findToken(
    "3236407267050ab7391b765be2ca02f5501b99b2bc3446d6e85c35814d79205465737420546f6b656e"
  );
  t.equal(
    address,
    "addr_test1qq3fc0gjusegngz6kpkm6gdzk20cdk9t2dnxy0883hskd7gjny96l55nvar503sxa7g59qygelkgxy7rsk03yrmppmqssdshvn"
  );
  t.end();
});

test(
  "blockfrost: findAll returns all addresses for a known policy",
  async (t) => {
    const addresses = await blockfrost.findAllTokens(
      "91d93c904ee184b0f9f8d0f589f941baf57d7b1e2e2945f308f5c061"
    );

    t.equal(addresses.length, 400);
    t.ok(
      addresses.find(
        (address) =>
          address ==
          "addr_test1qpl0c5q57fk5ygzx38lyftrzuvu0fjsyd80r8wfqp9graau3cpyc9pxlhz6cfplv0mea63eyd0u38x62uhwf90kdtuusmnv5hz"
      )
    );
    t.end();
  },
  { timeout: 9000, checkAssertionsCount: false }
);

test("blockfrost: getUtxos returns empty", async (t) => {
  const utxos = await blockfrost.getUtxos(
    "addr_test1qrj60ctnxw9pmdd3pl5hmj0k83yjckd0yv28pq6neszedx7j5ya6qq9zvzuh0x0s8m02h6h5knemtfcc0ttxutp8uhkq86ag9l"
  );
  t.deepEqual(utxos, []);
  t.end();
});

test("blockfrost: getUtxos returns UTXO", async (t) => {
  const utxos = await blockfrost.getUtxos(
    "addr_test1qzkqrmagdxrkqqyfdl8rcn7ry9rprwaz2gfj0kgr6rmwwy4uhxe3ywqg25x4kh7xdcsa38n343du4s2srghf0ry67pdqc6z4ql"
  );
  t.deepEqual(utxos.length, 1);
  t.end();
});

test(
  "blockfrost: getUtxos returns array",
  async (t) => {
    const utxos = await blockfrost.getUtxos(
      "addr_test1qz8hef0q3d74h86vplx4w5qcjqn5crced9yr3a7xrlr0e39uhxe3ywqg25x4kh7xdcsa38n343du4s2srghf0ry67pdqfk2dpf"
    );
    t.equal(utxos.length, 32);
    t.end();
  },
  { timeout: 9000 }
);

test("blockfrost: getStakedAddresses", async (t) => {
  const addresses = await blockfrost.getStakedAddresses(
    "stake_test1uz7tnvcj8qy92r2mtlrxugwcnec6ck72c9gp5t5h3jd0qkshdk2kv"
  );
  t.equal(addresses.length, 26);
  t.end();
});

test("blockfrost: getAssetAddresses", async (t) => {
  const addresses = await blockfrost.getAssetAddresses(
    "47cec2a1404ed91fc31124f29db15dc1aae77e0617868bcef351b8fddf91e329aa5a47288aca86568d24d4c1dbd69c8483934d0795fdc2c4fd13ec2c"
  );
  t.equal(addresses.length, 2);
  t.end();
});

test("blockfrost: getTokenHistory", async (t) => {
  const history = await blockfrost.getTokenHistory(
    "2b01d0497df9445820232aa8f48bf85c37afcb92e8b4efbf8fd176e21396bee0bdbe26a65c7a5c023dc1e1f813909004fc5e9a5f9c39f9399f82fd8e",
    100
  );
  t.ok(history.length > 50);
  t.end();
});

test("blockfrost: getConfirmations", async (t) => {
  const confirmations = await blockfrost.getConfirmations(
    "9dbe50247cadc5211f2108f4fe7f614abcf76e550e7f176afd30743ac0776806",
  );
  t.ok(confirmations > 50);
  t.end();
});
