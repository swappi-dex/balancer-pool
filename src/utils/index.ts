export function formatAccount(account: string) {
    // 0x... | cfx:0x...
    const [protocol, address] = account.split(':');
    const address_str = address || protocol;

    return `${address_str.slice(0, 6)}...${address_str.slice(-4)}`;
}

const intl = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

export function formatNumber(n: number | bigint) {
    return intl.format(n);
}
