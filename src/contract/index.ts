import { Contract, ContractRunner, TransactionResponse } from 'ethers';

import BrowserProvider from '../core/BrowserProvider';

export function callContractMethod<T = unknown>(Provider: ContractRunner, contract: Contract, method: string, ...args: any[]) {
    const c = contract.connect(Provider);
    return c.getFunction(method)(...args) as Promise<T>;
}

export async function callContractWriteMethod(browserProvider: BrowserProvider, contract: Contract, method: string, ...args: any[]) {
    const signer = await browserProvider.getSigner();
    const gasLimit = await signer.estimateGas({});
    const transactioResponse: TransactionResponse = await callContractMethod<TransactionResponse>(signer, contract, method, ...args, {
        gasLimit: gasLimit * 100n,
        gasPrice: 2n * 10n ** 11n,
    });
    // todo check error
    const transactioRreceipt = await transactioResponse.wait().catch(() => null);
    return {
        transactioResponse,
        transactioRreceipt,
    };
}
