const { ApiPromise, WsProvider } = require('@polkadot/api');
const { hexToU8a } = require('@polkadot/util');
const fs = require('fs').promises;

async function fetchAccountBalances() {
  // Connect to the node
  // const provider = new WsProvider('wss://moonbase-alpha.public.blastapi.io');
  const provider = new WsProvider('ws://48.217.137.246:9944');
  const api = await ApiPromise.create({ provider });

  const balances = {
    evm: []
  };


  console.log('Fetching EVM account balances...');
  // Fetch all EVM accounts
  const evmAccounts = await api.query.evm.accountStorages.keys();
  console.log('Fetching EVM account balances...', evmAccounts);

  // Fetch EVM balances
  for (const key of evmAccounts) {
    const evmAddress = `0x${Buffer.from(key.args[0]).toString('hex')}`;
    const balance = await api.query.evm.accountStorages(evmAddress, hexToU8a('0x0000000000000000000000000000000000000000000000000000000000000000'));
    const balanceHex = balance.toHex();
    const balanceInt = BigInt(balanceHex).toString();
    balances.evm.push({ address: evmAddress, balance: balanceInt });
  }

  await api.disconnect();

  // Save balances to JSON file
  await fs.writeFile('account_balances.json', JSON.stringify(balances, null, 2));
  console.log('Balances saved to account_balances.json');
}

fetchAccountBalances().catch(console.error);