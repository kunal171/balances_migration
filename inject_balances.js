const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { encodeAddress } = require('@polkadot/util-crypto');
const { BigNumber } = require('bignumber.js');
const fs = require('fs');

async function migrateBalances() {
  // Connect to your new Substrate chain
  const wsProvider = new WsProvider('ws://localhost:9944');
  const api = await ApiPromise.create({ provider: wsProvider });

  // Read the JSON file containing addresses and balances
  const data = JSON.parse(fs.readFileSync('substrate_balances.json', 'utf8'));

  // Create a keyring instance with ethereum type
  const keyring = new Keyring({ type: 'ethereum' });

  // Add Alith as the sudo account
  const sudoAccount = keyring.addFromUri('0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133');

  const alith = keyring.addFromUri('0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133');

  console.log("Alith's address:", alith.address);
  let alice_ethAddr = convertEthAddressToSubstrate(alith.address);
  console.log("Alith's eth address:", alice_ethAddr);

  // Get the sudo key from the chain
  const sudoKey = await api.query.sudo.key();
  console.log(`Sudo key is: ${sudoKey.toString()}`);

//   // Ensure the sudo account matches
//   if (sudoKey.toString() !== sudoAccount.address) {
//     throw new Error('The provided sudo account does not match the chain\'s sudo key');
//   }

  for (const [substrateAddress, balance] of Object.entries(data)) {
    try {
      // Convert Ethereum address to Substrate address
    //   const substrateAddress = convertEthAddressToSubstrate(ethAddress);

      // Convert balance to BigNumber and then to string in a proper format
      const balanceBN = new BigNumber(balance);
      const balanceFormatted = balanceBN.toFixed(0);

      console.log(`Processing: (${substrateAddress}) - Balance: ${balanceFormatted}`);

      // Create the inner call (forceSetBalance)
      const forceSetBalance = api.tx.balances.forceSetBalance(substrateAddress, balanceFormatted);

      // Wrap the call with sudo
      const sudoCall = api.tx.sudo.sudo(forceSetBalance);

      // Sign and send the extrinsic
      await new Promise((resolve, reject) => {
        sudoCall.signAndSend(sudoAccount, ({ status, events, dispatchError }) => {
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(dispatchError.asModule);
              const { docs, name, section } = decoded;
              reject(new Error(`${section}.${name}: ${docs.join(' ')}`));
            } else {
              reject(new Error(dispatchError.toString()));
            }
          } else if (status.isInBlock) {
            console.log(`Transaction included in block ${status.asInBlock}`);
          } else if (status.isFinalized) {
            console.log(`Transaction finalized in block ${status.asFinalized}`);
            resolve();
          }
        }).catch(reject);
      });
    } catch (error) {
      console.error(`Error force setting balance for ${substrateAddress}:`, error);
    }
  }

  console.log('Balance migration completed');
}

function convertEthAddressToSubstrate(ethAddress) {
  const addressWithoutPrefix = ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress;
  const paddedAddress = addressWithoutPrefix.padStart(64, '0');
  return encodeAddress(`0x${paddedAddress}`, 42);
}

migrateBalances().catch(console.error).finally(() => process.exit());