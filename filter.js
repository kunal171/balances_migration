const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');

async function main() {
    // Connect to the node
    const wsProvider = new WsProvider('ws://0.0.0.0:9933');
    const api = await ApiPromise.create({ provider: wsProvider });

    // Load the account data from JSON file
    const accountData = JSON.parse(fs.readFileSync('new_substrate_account_data_with_nonce.json', 'utf8'));

    const targetAccount = '0xc84e0108A61F168D3a04680f7C1e3647fE68d011';
    const zeroNonceAccounts = Object.entries(accountData).filter(([address, { nonce }]) => nonce === 0);

    console.log(`Found ${zeroNonceAccounts.length} accounts with zero nonce`);

    const accountsWithSentBalances = new Set();

    // Get the current block number
    const  currentBlock  = await api.query.system.number();

    // Define the range of blocks to check (e.g., the last 1000 blocks)
    const startBlock = Math.max(0, currentBlock - (currentBlock-1));

    // Iterate through the recent blocks
    for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
        try {
            // Fetch block hash for the current block number
            const blockHash = await api.rpc.chain.getBlockHash(blockNumber);

            // Check if block hash is valid
            if (!blockHash) {
                console.warn(`Block hash for block ${blockNumber} is not available.`);
                continue;
            }

            // Fetch events for the current block
            const events = await api.query.system.events.at(blockHash);

            // Process each event
            for (const { event } of events) {
                if (event.section === 'balances' && event.method === 'Transfer') {
                    const [from, to, amount] = event.data;
                    if (from.toString() === targetAccount) {
                        console.log(`Found transfer from ${targetAccount} to ${to.toString()} of amount ${amount.toString()}`);
                        if (zeroNonceAccounts.some(([address]) => address === to.toString())) {
                            accountsWithSentBalances.add(to.toString());
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error fetching data for block ${blockNumber}:`, error);
        }
    }

    // Filter accounts that have received tokens from the target account
    const filteredAccounts = zeroNonceAccounts.filter(([address]) => accountsWithSentBalances.has(address));

    console.log(`Filtered ${filteredAccounts.length} accounts that have received tokens from ${targetAccount}`);

    // Prepare result
    const result = {};
    filteredAccounts.forEach(([address, data]) => {
        result[address] = data;
    });

    // Save the filtered accounts to a JSON file
    fs.writeFileSync('filtered_accounts.json', JSON.stringify(result, null, 2));

    console.log('Filtered accounts saved to filtered_accounts.json');

    // Disconnect from the node
    await api.disconnect();
}

main().catch(console.error);
