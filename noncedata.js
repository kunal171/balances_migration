const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');

async function main() {
    // Connect to the node
    const wsProvider = new WsProvider('ws://0.0.0.0:9944');
    const api = await ApiPromise.create({ provider: wsProvider });

    // Fetch all the account keys from the node
    const accountKeys = await api.query.system.account.keys();

    // Prepare an object to store balances and nonces
    const accountData = {};

    // Fetch balances and nonces for each account
    for (const key of accountKeys) {
        const address = key.args[0].toString();
        const { data: { free }, nonce } = await api.query.system.account(key.args[0]);
        
        // Store balance and nonce
        accountData[address] = {
            balance: free.toString(),
            nonce: nonce.toNumber()
        };
    }

    // Save the balances and nonces to a JSON file
    fs.writeFileSync('new_substrate_account_data.json', JSON.stringify(accountData, null, 2));

    console.log('Account data saved to new_substrate_account_data.json');

    // Disconnect from the node
    await api.disconnect();
}

main().catch(console.error);
