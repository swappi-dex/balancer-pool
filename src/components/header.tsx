import { generateAvatarURL } from '@cfx-kit/wallet-avatar';
import { useAccount, useChainId, connect, switchChain } from '@cfxjs/use-wallet-react/ethereum';

import { formatAccount } from '../utils';

// not connect wallet enter page, status: in-detecting -> not-active, after call connect wallet, not-active -> in-active, after metamask click connect, in-active -> active
// connect wallet refres page, status: in-detecting -> active
function Header() {
    const account = useAccount();
    const chainId = useChainId();

    const isTargetChain = chainId === import.meta.env.TargetChainId;

    return (
        <div className="h-20 flex flex-row items-center justify-between">
            <div className="w-[290px] h-10 bg-[url('/logo.svg')]"></div>
            <div className="flex flex-row">
                {isTargetChain && (
                    <div className="px-4 flex flex-row items-center h-10 text-sm leading-none rounded-[40px] text-white border border-current">
                        <div className="w-2 h-2 rounded-full border-[2px] border-[#009595]/20 bg-[#009595] bg-clip-content"></div>
                        <div className="ml-1 w-6 h-6 bg-[url(/conflux-network-icon.svg)]"></div>
                        <div className="ml-1 font-medium">Conflux eSpace</div>
                    </div>
                )}
                {account && !isTargetChain && (
                    <button
                        onClick={() => {
                            switchChain('0x' + Number(import.meta.env.TargetChainId).toString(16)).catch(console.log);
                        }}
                        className="ml-5 h-10 px-6 rounded-full bg-[#38A0DA] text-sm leading-10 text-white"
                    >
                        Switch Network
                    </button>
                )}
                {!account && (
                    <button
                        onClick={() => {
                            connect();
                        }}
                        className="ml-5 h-10 px-6 rounded-full bg-[#38A0DA] text-sm leading-10 text-white"
                    >
                        Connect Wallet
                    </button>
                )}
                {account && (
                    <div className="ml-5 px-4 flex flex-row items-center h-10 text-sm leading-none rounded-[40px] text-white border border-current">
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                            <img
                                key={account}
                                src={generateAvatarURL(account)}
                                alt="avatar"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                        <div className="ml-2 font-medium">{formatAccount(account)}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Header;
