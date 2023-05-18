import fs from 'fs';
import { basename } from 'path';
import { promisify } from 'util';

interface AbiLoaderOptions {
    addressMap?: Record<string, string>;
}

function abiLoader(options: AbiLoaderOptions = {}) {
    const address = options.addressMap || {};
    const abiRegex = /\.abi$/;
    return {
        name: 'abi-loader',
        enforce: 'pre',

        async load(id: string) {
            if (!id.match(abiRegex)) {
                return;
            }

            const [filePath] = id.split('?', 2);

            const fileBasename = basename(filePath);
            const [fileNameWithOutEXT] = fileBasename.split('.');
            const contract_address = address[fileNameWithOutEXT];

            const abitext = await promisify(fs.readFile)(filePath, 'utf-8');

            const source = `import { Interface, Contract } from 'ethers';
            export default new Contract("${contract_address}", Interface.from(JSON.parse(${JSON.stringify(abitext)})))`;

            return source;
        },
    };
}

export default abiLoader;
