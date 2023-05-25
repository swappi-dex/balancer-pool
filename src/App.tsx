import { useEffect } from 'react';
import { useAccount } from '@cfxjs/use-wallet-react/ethereum';
import { useRequest, useSetState } from 'ahooks';

import { formatNumberWithDecimals, formatNumberWithDecimals8 } from './utils';
import Modal from './components/modal';
import { Tag } from './components/tag';

import PoolWithBalancerContract from './contract/abi/PoolWithBalancer.abi';

// import ERC20ABIJSON from './contract/abi/ERC20.json';
import { CFXTokenAddress, ETCTokenAddress, PPITokenAddress } from './contract/tokenAddress';
import { callContractWriteMethod } from './contract';
import Header from './components/header';

import {
    balanceOf,
    getAPR,
    getLiquidity,
    getNormalizedWeight0,
    getNormalizedWeight1,
    getPairAmounts,
    getPoolTotalSupply,
    getPriceBasedOnUSDT,
    precisionNumber,
    pairContract,
    accountPrivider,
} from './service';
import PoolInfoAndMyLocked from './components/PoolInfoAndMyLocked';

interface WithdrawFormProps {
    amountsAndTotalSupply?: {
        pairAddress: string;
        amounts: {
            address: string;
            amount: bigint;
        }[];
        totalSupply: bigint;
    };
    maxAmount?: bigint;
}

function WithdrawForm({ amountsAndTotalSupply, maxAmount = 0n }: WithdrawFormProps) {
    const account = useAccount();

    const [{ amount }, setState] = useSetState({
        amount: '0',
    });

    const amountIsNumber = !Number.isNaN(Number(amount));
    const hasAmountsAndTotalSupply = !!amountsAndTotalSupply;

    const tokenAmounts =
        hasAmountsAndTotalSupply && amountIsNumber
            ? amountsAndTotalSupply.amounts.map((item) => {
                  return {
                      address: item.address,
                      amount: (item.amount * BigInt(Math.floor(Number(amount) * 10 ** 18))) / amountsAndTotalSupply.totalSupply,
                  };
              })
            : [];

    const CFXAmount = tokenAmounts.find((item) => item.address === CFXTokenAddress)?.amount || 0n;
    const ETCAmount = tokenAmounts.find((item) => item.address === ETCTokenAddress)?.amount || 0n;

    return (
        <div className="mt-[112px] w-[700px] h-[452px] px-5 pt-[26px] pb-5 flex flex-col rounded-[32px] text-white border border-[#D0D0D0] bg-black">
            <div className="pr-2 flex flex-row items-start justify-between">
                <div className="text-base leading-5 font-normal">Withdraw Liquidity</div>
                <button data-modal-active="close" className="w-6 h-6 bg-cover bg-[url(/close-icon.svg)]"></button>
            </div>
            <div className="mt-8 pr-5 text-base leading-5 text-right">Available: {formatNumberWithDecimals(maxAmount)} LP</div>
            <div className="mt-2 flex flex-row rounded-full border border-current">
                <div className="px-6 py-2.5 text-base/5 font-normal border-r border-current">98ETC-2CFX LP</div>
                <div className="flex-1 overflow-hidden pr-5 py-2.5 text-base/5 font-black text-right">
                    <input
                        value={amount}
                        onChange={(e) => {
                            setState({
                                amount: e.target.value,
                            });
                        }}
                        className="w-full outline-none text-right bg-transparent"
                    />
                </div>
            </div>
            <div className="py-6 pl-6 pr-5 mt-5 rounded-[32px] border border-current">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center">
                        <img className="w-8 h-8" src="/cfx-logo.png" alt="cfx" />
                        <span className="ml-2 text-base/5 font-medium">CFX</span>
                    </div>
                    <div className="text-base/5 font-black">{formatNumberWithDecimals8(CFXAmount)}</div>
                </div>
                <div className="mt-4 flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center">
                        <img className="w-8 h-8" src="/etc-logo.png" alt="cfx" />
                        <span className="ml-2 text-base/5 font-medium">ETC</span>
                    </div>
                    <div className="text-base/5 font-black">{formatNumberWithDecimals8(ETCAmount)}</div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col justify-end">
                <button
                    onClick={async () => {
                        if (!amountsAndTotalSupply || !accountPrivider) {
                            return;
                        }
                        const diff = 0.002; // 0.2%
                        const diffBigInt = BigInt(diff * 10 ** 3) * 10n ** 15n;
                        const { transactioResponse, transactioRreceipt } = await callContractWriteMethod(
                            accountPrivider,
                            PoolWithBalancerContract,
                            'withdraw',
                            BigInt(Math.floor(Number(amount) * 10 ** 18)),
                            (ETCAmount * (1n * precisionNumber - diffBigInt)) / precisionNumber, // (ETCAmount * BigInt(diff * 10 ** 18)) / precisionNumber,
                            (CFXAmount * (1n * precisionNumber - diffBigInt)) / precisionNumber, // (CFXAmount * BigInt(diff * 10 ** 18)) / precisionNumber,
                            account,
                            Math.floor(new Date().getTime() / 1000 + 1800)
                        );
                        console.log({
                            transactioResponse,
                            transactioRreceipt,
                        });
                    }}
                    className="w-full h-[46px] text-xl/none rounded-full border border-current"
                >
                    Withdraw
                </button>
            </div>
        </div>
    );
}

function App() {
    const account = useAccount();

    const { data: farmLiquidity } = useRequest(getLiquidity, {
        defaultParams: [ETCTokenAddress],
        refreshOnWindowFocus: true,
    });
    const { data: normalizedWeight0, run: runNormalizedWeight0 } = useRequest(getNormalizedWeight0, {
        manual: true,
        refreshOnWindowFocus: true,
    });
    const { data: normalizedWeight1, run: runNormalizedWeight1 } = useRequest(getNormalizedWeight1, {
        manual: true,
        refreshOnWindowFocus: true,
    });

    const { data: apr } = useRequest(getAPR, {
        defaultParams: [],
        refreshOnWindowFocus: true,
    });

    const { data: LPbalance, run: runBalanceOf } = useRequest(balanceOf, {
        manual: true,
        refreshOnWindowFocus: true,
    });

    const { data: PPIAmountAndTotalPrice = [], run: runPPIAmount } = useRequest(
        async (account) => {
            if (!window.ethereum || !(window.ethereum as any).isConnected() || !(window.ethereum as any).selectedAddress) {
                return [0n, 0n];
            }
            // 需要使用 钱包的 provider 既使用 入参 也使用了 from
            const claimReward = await accountPrivider.getSigner().then((signer) =>
                PoolWithBalancerContract.connect(signer)
                    .getFunction('claimReward')
                    .staticCall(account)
                    .catch((err) => {
                        console.log(err);
                        return 0n;
                    })
            );

            const PPIPrice = await getPriceBasedOnUSDT(PPITokenAddress);
            return [claimReward, (PPIPrice * claimReward) / precisionNumber] as bigint[];
        },
        {
            manual: true,
            refreshOnWindowFocus: true,
            pollingInterval: 1000,
        }
    );

    const { data: amountsAndTotalSupply } = useRequest(
        async () => {
            const [pairAddress, amounts, totalSupply] = await Promise.all([
                pairContract.getAddress(),
                getPairAmounts(pairContract),
                getPoolTotalSupply(pairContract),
            ]);
            return {
                pairAddress,
                amounts,
                totalSupply,
            };
        },
        {
            defaultParams: [],
        }
    );

    useEffect(() => {
        if (pairContract) {
            runNormalizedWeight0(pairContract);
            runNormalizedWeight1(pairContract);
        }
    }, [pairContract]);

    useEffect(() => {
        if (account) {
            runBalanceOf(account);
            runPPIAmount(account);
        }
    }, [account]);

    return (
        <>
            <div className="min-h-full bg-black">
                <div className="mx-auto min-w-[1440px] w-[1440px] h-[900px] px-5 pb-[22px] flex flex-col justify-between bg-[url('/bg-app.png')] bg-cover">
                    <Header />
                    <div className="-mx-[22px] h-20 bg-[url('/title.svg')]"></div>
                    <div className="w-full h-[452px] flex flex-row justify-stretch ">
                        <div className="flex-1 rounded-[32px] text-white bg-[#38A0DA]">
                            <div className="flex flex-col justify-between w-full h-full p-5 pb-6 ">
                                <div className="flex flex-row items-stretch">
                                    <div className="relative p-2 w-28 rounded-[28px] bg-white/60">
                                        <div className='w-15 h-15 bg-cover bg-[url("/cfx-logo.png")]'></div>
                                        <div className='absolute left-11 top-2 w-15 h-15 bg-cover bg-[url("/etc-logo.png")]'></div>
                                    </div>
                                    <div className="ml-5 flex flex-col justify-between">
                                        <div className=" font-black text-[32px] leading-[39px]">ETC-CFX Weighted Pool</div>
                                        <div>
                                            <Tag>{formatNumberWithDecimals((normalizedWeight1 || 0n) * 100n)}%&nbsp;ETC</Tag>
                                            <Tag className="ml-2">{formatNumberWithDecimals((normalizedWeight0 || 0n) * 100n)}%&nbsp;CFX</Tag>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="mt-5 font-medium text-base leading-5">APR</div>
                                    <div className="mt-2 text-[68px] leading-[83px] font-black">{formatNumberWithDecimals(apr || 0n)}%</div>
                                    <div className="mt-5 font-medium text-base leading-5">Liquidity</div>
                                    <div className="mt-2 text-[68px] leading-[83px] font-black">{formatNumberWithDecimals(farmLiquidity || 0n)}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden flex flex-col justify-stretch">
                            <div className="flex-1 flex flex-row justify-stretch">
                                <div className="flex-1 p-5 flex flex-col rounded-[32px] text-[#000] bg-white">
                                    <div className="flex-1">
                                        <div className="text-base leading-5 font-medium">My Pool</div>
                                        <div className="mt-6 text-xl leading-[29px] font-black">
                                            {formatNumberWithDecimals8(LPbalance?.totalBalance || 0n)} LP
                                        </div>
                                        <div className="mt-2 text-sm leading-[17px] font-medium">
                                            ~${formatNumberWithDecimals(((LPbalance?.lpPrice || 0n) * (LPbalance?.totalBalance || 0n)) / precisionNumber)}
                                        </div>
                                    </div>
                                    <button
                                        data-modal-active="open"
                                        className="w-full py-2 px-4 h-[46px] flex items-center justify-center text-[24px] rounded-[32px] border border-current"
                                    >
                                        Withdraw
                                    </button>
                                </div>
                                <div className="flex-1 p-5 flex flex-col rounded-[32px] text-white bg-[#38A0DA]">
                                    <div className="flex-1">
                                        <div className="text-base leading-5 font-medium">Rewards</div>
                                        <div className="mt-6 text-xl leading-[29px] font-black">
                                            {formatNumberWithDecimals8(PPIAmountAndTotalPrice[0] || 0n)} PPI
                                        </div>
                                        <div className="mt-2 text-sm leading-[17px] font-medium">
                                            ~${formatNumberWithDecimals(PPIAmountAndTotalPrice[1] || 0n)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const { transactioResponse } = await callContractWriteMethod(
                                                accountPrivider,
                                                PoolWithBalancerContract,
                                                'claimReward',
                                                account
                                            );
                                            console.log({
                                                transactioResponse,
                                            });
                                            runPPIAmount(account);
                                        }}
                                        className="w-full py-2 px-4 h-[46px] flex items-center justify-center text-[24px] rounded-[32px] border border-current"
                                    >
                                        Claim
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden rounded-[32px] bg-[#FFCB14] text-black">
                                <PoolInfoAndMyLocked lockedBalanceList={LPbalance?.lockedBalanceList} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Modal className="pt-[112px]">
                <WithdrawForm amountsAndTotalSupply={amountsAndTotalSupply} maxAmount={LPbalance?.unlockedBalance || 0n} />
            </Modal>
        </>
    );
}

export default App;
