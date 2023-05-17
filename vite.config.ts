import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import abi from './vite-abi-loader';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        abi({
            addressMap: {
                SwappiPairWeighted: '0x5ba29eb5d42e7e9ea19a15d6b248ecfc83d1c1d7',
                SwappiRouterWeighted: '0xfbf882a0faa57bf8ec1741b08742333ca633fa89',
                SwappiFactoryWeighted: '0xe1e69070fe918078462cba713bcf4eeb831e2da2',
            },
        }),
    ],
});
