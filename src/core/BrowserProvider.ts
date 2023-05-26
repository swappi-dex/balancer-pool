import { assertArgument } from 'ethers';

import { JsonRpcApiProvider } from 'ethers';

import type { JsonRpcError, JsonRpcPayload, JsonRpcResult, JsonRpcSigner } from 'ethers';
import type { Networkish } from 'ethers';
import EthereumManager from './EthereumManager';

class BrowserProvider extends JsonRpcApiProvider {
    constructor(public em: EthereumManager, network?: Networkish) {
        super(network, { batchMaxCount: 1 });
    }

    requestError(
        e: any,
        payload: {
            method: string;
            params: any[] | Record<string, any>;
        }
    ) {
        const error = new Error(e.message);
        (<any>error).code = e.code;
        (<any>error).data = e.data;
        (<any>error).payload = payload;
        this.emit('debug', { action: 'receiveEip1193Error', error });
        throw error;
    }

    async #request(method: string, params: Array<any> | Record<string, any>) {
        if (!this.em.has()) {
            throw new Error('not metamask');
        }
        const payload = { method, params };
        this.emit('debug', { action: 'sendEip1193Request', payload });
        const result = await this.em
            .get()
            .request(payload)
            .catch((e) => this.requestError(e, payload));
        this.emit('debug', { action: 'receiveEip1193Result', result });
        return result;
    }

    async send(method: string, params: Array<any> | Record<string, any>): Promise<any> {
        await this._start();

        return await super.send(method, params);
    }

    async _send(payload: JsonRpcPayload | Array<JsonRpcPayload>): Promise<Array<JsonRpcResult | JsonRpcError>> {
        assertArgument(!Array.isArray(payload), 'EIP-1193 does not support batch request', 'payload', payload);

        const result = await this.#request(payload.method, payload.params || []).catch((e: any) => {
            return [
                {
                    id: payload.id,
                    error: { code: e.code, data: e.data, message: e.message },
                },
            ];
        });
        return [{ id: payload.id, result }];
    }

    getRpcError(payload: JsonRpcPayload, error: JsonRpcError): Error {
        error = JSON.parse(JSON.stringify(error));

        // EIP-1193 gives us some machine-readable error codes, so rewrite
        // them into
        switch (error.error.code || -1) {
            case 4001:
                error.error.message = `ethers-user-denied: ${error.error.message}`;
                break;
            case 4200:
                error.error.message = `ethers-unsupported: ${error.error.message}`;
                break;
        }

        return super.getRpcError(payload, error);
    }

    async hasSigner(address: number | string): Promise<boolean> {
        if (address == null) {
            address = 0;
        }

        const accounts = await this.send('eth_accounts', []);
        if (typeof address === 'number') {
            return accounts.length > address;
        }

        address = address.toLowerCase();
        return accounts.filter((a: string) => a.toLowerCase() === address).length !== 0;
    }

    async getSigner(address?: number | string): Promise<JsonRpcSigner> {
        if (address == null) {
            address = 0;
        }

        if (!(await this.hasSigner(address))) {
            await this.#request('eth_requestAccounts', []).catch((error: any) => {
                const payload = error.payload;
                throw this.getRpcError(payload, { id: payload.id, error });
            });
        }

        return await super.getSigner(address);
    }
}

export default BrowserProvider;
