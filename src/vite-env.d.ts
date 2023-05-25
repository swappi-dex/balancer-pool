/// <reference types="vite/client" />

declare module '*.abi' {
    import type { Contract } from 'ethers';
    const classes: Contract;
    export default classes;
}

interface Window {
    ethereum: import('ethers').Eip1193Provider & {
        isMetaMask?: boolean;
        chainId: string;
        selectAddress: null | string;
        isConnected(): boolean;
    };
}
