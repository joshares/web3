require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.RPC_URL;               // e.g. Infura / Alchemy
  const privateKey = process.env.PRIVATE_KEY;       // EOA private key
  const delegateAddress = process.env.DELEGATE;     // Deployed contract address
  const chainId = process.env.CHAIN_ID || 1;        // Default: Ethereum mainnet

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const eoaAddress = wallet.address;

  console.log("EOA:", eoaAddress);

  const currentNonce = await wallet.getNonce();
  const authNonce = currentNonce + 1; // Had to +1, see explanation below 👇

  const auth = await wallet.authorize({
    address: delegateAddress,
    nonce: authNonce,
    chainId,
  });

  const tx = await wallet.sendTransaction({
    to: eoaAddress,
    data: "0x",
    type: 4, // EIP-7702 ephemeral delegation
    authorizationList: [auth],
    value: 0,
  });

  console.log("Delegation Tx Hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Status:", receipt.status === 1 ? "✅ Success" : "❌ Reverted");

  const code = await provider.getCode(eoaAddress);
  console.log("EOA Code:", code); // Expected: 0xef0100 + delegateAddress
}

main().catch(console.error);
