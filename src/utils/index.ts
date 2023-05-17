export function formatAccount(account: string) {
    // 0x... | cfx:0x...
    const [protocol, address] = account.split(':');
    const address_str = address || protocol;

    return `${address_str.slice(0, 6)}...${address_str.slice(-4)}`;
}
