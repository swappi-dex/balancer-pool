export function formatAccount(account: string) {
    // 0x... | cfx:0x...
    const [protocol, address] = account.split(':');
    const address_str = address || protocol;

    return `${address_str.slice(0, 6)}...${address_str.slice(-4)}`;
}

export const Digits = 2;

const intl = new Intl.NumberFormat('en-US', { maximumFractionDigits: Digits });

export function formatNumber(n: number | bigint) {
    return intl.format(n);
}

export function formatNumberWithDecimals(n: bigint) {
    return formatNumber(Number((n / 10n ** (18n - BigInt(Digits))).toString()) / 10 ** 2);
}
