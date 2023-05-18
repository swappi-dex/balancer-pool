import { UserConfig, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import abi from './vite-abi-loader';
import fs from 'fs';
import { promisify } from 'util';
import { JsonRpcProvider, Contract } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({
    path: `./.env.${process.env.NODE_ENV}`,
});

import { ETCTokenAddress, CFXTokenAddress } from './src/contract/tokenAddress';

export default defineConfig(async () => {
    const Provider = new JsonRpcProvider(process.env.VITE_ESpaceRpcUrl);
    const abiJSON = await promisify(fs.readFile)('./src/contract/abi/SwappiFactoryWeighted.abi', 'utf8').then(JSON.parse);
    const c = new Contract('0xe1e69070fe918078462cba713bcf4eeb831e2da2', abiJSON);
    const SwappiPairWeightedAddress = await c.connect(Provider).getFunction('getPair')(ETCTokenAddress, CFXTokenAddress);

    return {
        plugins: [
            react(),
            abi({
                addressMap: {
                    SwappiPairWeighted: SwappiPairWeightedAddress,
                    SwappiRouterWeighted: '0xfbf882a0faa57bf8ec1741b08742333ca633fa89',
                    SwappiFactoryWeighted: '0xe1e69070fe918078462cba713bcf4eeb831e2da2',
                },
            }),
        ],
    } as UserConfig;
});
