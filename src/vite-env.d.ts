/// <reference types="vite/client" />

declare module '*.abi' {
    import type { Contract } from 'ethers';
    const classes: Contract;
    export default classes;
}
