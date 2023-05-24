import { UserConfig, defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import abi from './vite-abi-loader';
import { JsonRpcProvider, Contract } from 'ethers';
import { callContractMethod } from './src/contract/index';
import fs from 'fs';
import { promisify } from 'util';

export default defineConfig(async ({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    const Provider = new JsonRpcProvider(env.VITE_ESpaceRpcUrl);

    const PoolWithBalancer = '0x777d778939dd61d9779e8848b23f55aa2b563c6b';

    const abiJSON = await promisify(fs.readFile)('./src/contract/abi/PoolWithBalancer.abi')
        .then((buffer) => buffer.toString())
        .then(JSON.parse);

    const contract = new Contract(PoolWithBalancer, abiJSON);

    const LPTokenAddress = await callContractMethod<string>(Provider, contract, 'lpToken');
    const routerAddress = await callContractMethod<string>(Provider, contract, 'router');

    const ETCTokenAddress = await callContractMethod<string>(Provider, contract, 'minedToken');
    const PPITokenAddress = await callContractMethod<string>(Provider, contract, 'rewardToken');

    return {
        define: {
            'import.meta.env.LPTokenAddress': JSON.stringify(LPTokenAddress.toLocaleLowerCase()),
            'import.meta.env.ETCTokenAddress': JSON.stringify(ETCTokenAddress.toLocaleLowerCase()),
            'import.meta.env.PPITokenAddress': JSON.stringify(PPITokenAddress.toLocaleLowerCase()),
        },
        plugins: [
            react(),
            abi({
                addressMap: {
                    PoolWithBalancer,
                    PPIFactory: '0xf256ea0bcb5a3a3a2cef0af4d927b1900f9fc18b',
                    SwappiFarmWeighted: '0x13319d155e2d8f26f421214111b5592a86088878',
                    SwappiRouterWeighted: routerAddress, // router
                    BaseSwappiFactoryWeighted: '0x36b83e0d41d1dd9c73a006f0c1cbc1f096e69e34', // from swappi
                },
            }),
        ],
    } as UserConfig;
});
