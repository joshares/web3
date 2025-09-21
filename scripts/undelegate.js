// revoke-delegation.js
// Usage: set values in a .env file (RPC_URL, OWNER_PRIVATE_KEY, GAS_PAYER_PRIVATE_KEY, OWNER_ADDRESS, CHAIN_ID)

import "dotenv/config";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC_URL = process.env.RPC_URL;                        // e.g. https://mainnet.infura.io/v3/<KEY>
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;    // For signing only (never commit!)
const OWNER_ADDRESS = process.env.OWNER_ADDRESS;            // e.g. 0xabc...
const GAS_PAYER_PRIVATE_KEY = process.env.GAS_PAYER_PRIVATE_KEY; // Funded wallet for gas
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 1);         // Default: 1 (Mainnet)
const GAS_LIMIT = BigInt(process.env.GAS_LIMIT ?? 100000);  // Gas limit (BigInt)

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function main() {
  if (!RPC_URL || !OWNER_PRIVATE_KEY || !GAS_PAYER_PRIVATE_KEY || !OWNER_ADDRESS) {
    throw new Error("Please set RPC_URL, OWNER_PRIVATE_KEY, GAS_PAYER_PRIVATE_KEY, and OWNER_ADDRESS in .env");
  }

  const provider = new JsonRpcProvider(RPC_URL);

  // Step 1: Get the current nonce for the owner wallet
  const nonce = await provider.getTransactionCount(OWNER_ADDRESS, "latest");
  console.log(`Current nonce for ${OWNER_ADDRESS}: ${nonce}`);

  // Optional: check current code (to inspect delegation status)
  const currentCode = await provider.getCode(OWNER_ADDRESS);
  console.log(`Current code for ${OWNER_ADDRESS}: ${currentCode}`);

  // Step 2: Sign the revocation authorization with the owner signer
  const ownerSigner = new Wallet(OWNER_PRIVATE_KEY, provider);

  // NOTE: Some toolchains require nonce + 1 instead of nonce
  const authNonce = nonce;

  const revocationAuth = await ownerSigner.authorize({
    address: ZERO_ADDRESS, // revoke by setting delegate to zero address
    nonce: authNonce,
    chainId: CHAIN_ID,
  });

  console.log("Signed revocation authorization:", revocationAuth);

  // Step 3: Broadcast the transaction using the gas payer
  const gasPayerSigner = new Wallet(GAS_PAYER_PRIVATE_KEY, provider);

  const feeData = await provider.getFeeData();

  const txRequest = {
    type: 4n, // EIP-7702 ephemeral delegation tx
    to: ZERO_ADDRESS, // safe no-op
    value: 0n,
    data: "0x",
    gasLimit: GAS_LIMIT,
    chainId: CHAIN_ID,
    authorizationList: [revocationAuth],
    maxFeePerGas: feeData.maxFeePerGas ?? undefined,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
  };

  const tx = await gasPayerSigner.sendTransaction(txRequest);
  console.log(`Transaction sent! Hash: ${tx.hash}`);
  console.log(`View on Etherscan: https://etherscan.io/tx/${tx.hash}`);

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Optional: confirm code after revocation
  const postCode = await provider.getCode(OWNER_ADDRESS);
  console.log(`Post-revocation code for ${OWNER_ADDRESS}: ${postCode}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
