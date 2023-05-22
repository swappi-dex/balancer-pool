import { UserConfig, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import abi from './vite-abi-loader';

// 0x49916ba65d0048c4bbb0a786a527d98d10a1cd2d

export default defineConfig(async () => {
    return {
        plugins: [
            react(),
            abi({
                addressMap: {
                    PPI: '0xf256ea0bcb5a3a3a2cef0af4d927b1900f9fc18b',
                    SwappiFarmWeighted: '0x13319d155e2d8f26f421214111b5592a86088878',
                    SwappiRouterWeighted: '0xfbf882a0faa57bf8ec1741b08742333ca633fa89',
                    BaseSwappiFactoryWeighted: '0x36b83e0d41d1dd9c73a006f0c1cbc1f096e69e34',
                    SwappiFactoryWeighted: '0xe1e69070fe918078462cba713bcf4eeb831e2da2',
                },
            }),
        ],
    } as UserConfig;
});
