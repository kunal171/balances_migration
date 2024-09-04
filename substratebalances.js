const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');

async function main() {
    // Connect to the node
    const wsProvider = new WsProvider('ws://48.217.137.246:9944');
    const api = await ApiPromise.create({ provider: wsProvider });

    // Fetch all the account keys from the node
    const accountKeys = await api.query.system.account.keys();

    // Prepare an object to store balances
    const balances = {};

    // Fetch balances for each account
    for (const key of accountKeys) {
        const address = key.args[0].toString();
        const { data: balance } = await api.query.system.account(key.args[0]);
        balances[address] = balance.free.toString();
    }

    // Save the balances object to a JSON file
    fs.writeFileSync('balances.json', JSON.stringify(balances, null, 2));

    console.log('Balances saved to balances.json');

    // Disconnect from the node
    await api.disconnect();
}

main().catch(console.error);
