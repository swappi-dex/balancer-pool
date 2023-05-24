import { useEffect, useMemo, useState } from 'react';
import { generateAvatarURL } from '@cfx-kit/wallet-avatar';
import { useAccount, useChainId, connect, switchChain } from '@cfxjs/use-wallet-react/ethereum';
import { useRequest, useSetState } from 'ahooks';
import { Contract, JsonRpcProvider, BrowserProvider } from 'ethers';

import { formatAccount, formatNumberWithDecimals, formatNumberWithDecimals8 } from './utils';
import Modal from './components/modal';
import { Tag } from './components/tag';

import PPIContract from './contract/abi/PPIFactory.abi';
import FarmContract from './contract/abi/SwappiFarmWeighted.abi';
import BaseFactoryContract from './contract/abi/BaseSwappiFactoryWeighted.abi';
import RouterContract from './contract/abi/SwappiRouterWeighted.abi';
import PoolWithBalancerContract from './contract/abi/PoolWithBalancer.abi';

import PairContractAbi from './contract/abi/SwappiPairWeighted.json';
// import ERC20ABIJSON from './contract/abi/ERC20.json';
import { CFXTokenAddress, ETCTokenAddress, FaucetUSDTAddress, PPITokenAddress } from './contract/tokenAddress';
import { callContractMethod, callContractWriteMethod } from './contract';

const Provider = new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl);

const precisionNumber = 10n ** 18n;

async function getPoolTotalSupply(pairContract?: Contract) {
    const pC = pairContract || (await getPairContract());
    const totalSupply = await callContractMethod<bigint>(Provider, pC, 'totalSupply');
    return totalSupply;
}

async function getNormalizedWeight0(PairContract: Contract) {
    const result = await callContractMethod<bigint>(Provider, PairContract, '_normalizedWeight0');
    return result;
}

async function getNormalizedWeight1(PairContract: Contract) {
    const result = await callContractMethod<bigint>(Provider, PairContract, '_normalizedWeight1');
    return result;
}

async function getPairAmounts(PairContract: Contract) {
    const address0 = await callContractMethod<string>(Provider, PairContract, 'token0');
    const address1 = await callContractMethod<string>(Provider, PairContract, 'token1');
    const result = await callContractMethod<[bigint, bigint]>(Provider, PairContract, 'getReserves');
    const [amount0, amount1] = result;
    return [
        {
            address: address0.toLocaleLowerCase(),
            amount: amount0,
        },
        {
            address: address1.toLocaleLowerCase(),
            amount: amount1,
        },
    ];
}

async function getPairContract() {
    const pairAddress = import.meta.env.LPTokenAddress;
    const pContract = new Contract(pairAddress, PairContractAbi);
    return pContract;
}

async function getPairAmountsFromTokens() {
    const pContract = await getPairContract();
    const amounts = await getPairAmounts(pContract);
    return amounts;
}

// 获取 CFX 相对于 USDT 的价格 也就是相对于法币的价格
async function getCFXPrice() {
    const pairAddress = await callContractMethod<string>(Provider, BaseFactoryContract, 'getPair', CFXTokenAddress, FaucetUSDTAddress);
    const BasePairContract = new Contract(pairAddress, PairContractAbi);
    const amounts = await getPairAmounts(BasePairContract);
    const CFXAmount = amounts.find((item) => item.address === CFXTokenAddress)!;
    const USDTAmount = amounts.find((item) => item.address === FaucetUSDTAddress)!;
    return (USDTAmount.amount * precisionNumber) / CFXAmount.amount;
}

// 获取 CFX 相对于 USDT 的价格 也就是相对于法币的价格
async function getPriceBasedOnUSDT(tokenAdress: string) {
    const pairAddress = await callContractMethod<string>(Provider, BaseFactoryContract, 'getPair', tokenAdress, FaucetUSDTAddress);
    const BasePairContract = new Contract(pairAddress, PairContractAbi);
    const amounts = await getPairAmounts(BasePairContract);
    const CFXAmount = amounts.find((item) => item.address === tokenAdress)!;
    const USDTAmount = amounts.find((item) => item.address === FaucetUSDTAddress)!;
    return (USDTAmount.amount * precisionNumber) / CFXAmount.amount;
}

// 计算基于 CFX 下 token 价格
async function getTokenPriceBasedOnCFX(amounts: Awaited<ReturnType<typeof getPairAmountsFromTokens>>, pairContract: Contract) {
    const index = amounts[0].address === CFXTokenAddress ? 1 : 0;
    const [normalizedWeight0, normalizedWeight1] = await Promise.all([getNormalizedWeight0(pairContract), getNormalizedWeight1(pairContract)]);
    const price = await callContractMethod<bigint>(Provider, RouterContract, 'quote', 1n * precisionNumber, amounts[index].amount, amounts[1 - index].amount, [
        normalizedWeight0,
        normalizedWeight1,
    ]);
    return price;
}

async function getTotalLiquidity(tokenAddress: string) {
    const [pairContract, amounts, CFXPrice] = await Promise.all([getPairContract(), getPairAmountsFromTokens(), getCFXPrice()]);
    const tokenAmount = amounts.find((item) => item.address === tokenAddress)!.amount;
    const CFXAmount = amounts.find((item) => item.address === CFXTokenAddress)!.amount;
    const priceBasedOnCFX = await getTokenPriceBasedOnCFX(amounts, pairContract);
    const lpPoolTotalLiquidity = ((priceBasedOnCFX * tokenAmount + CFXAmount * 1n * precisionNumber) * CFXPrice) / 10n ** (18n + 18n);
    return lpPoolTotalLiquidity;
}

async function getLiquidity(tokenAddress: string) {
    const [lpPoolTotalLiquidity, farmPollInfo, totalSupply] = await Promise.all([getTotalLiquidity(tokenAddress), getFarmPoolInfo(), getPoolTotalSupply()]);
    return (lpPoolTotalLiquidity * farmPollInfo.totalSupply) / totalSupply;
}

async function getFarmPoolInfo() {
    const allPoolInfo = await callContractMethod<Array<[string, bigint, bigint, bigint, bigint, bigint]>>(Provider, FarmContract, 'getPoolInfo', 0);
    const pairAddress = import.meta.env.LPTokenAddress;
    const poolInfo = allPoolInfo.find((i) => i[0].toLocaleLowerCase() === pairAddress);
    const [token, allocPoint, lastRewardTime, totalSupply, workingSupply, accRewardPerShare] = poolInfo!;
    return { token, allocPoint, lastRewardTime, totalSupply, workingSupply, accRewardPerShare };
}

async function getAPR() {
    const APR_SHARE_NUMBER = 2n;
    const start = Math.floor(new Date().getTime() / 1000);
    const [farmPollInfo, calculateReward, totalAllocPoint, ppiPrice, k, liquidity] = await Promise.all([
        getFarmPoolInfo(),
        callContractMethod<bigint>(Provider, PPIContract, 'calculateReward', start, start + 1),
        callContractMethod<bigint>(Provider, FarmContract, 'totalAllocPoint'),
        getPriceBasedOnUSDT(PPITokenAddress),
        callContractMethod<bigint>(Provider, FarmContract, 'k'),
        getPoolTotalSupply(),
    ]);

    const poolPPIReward = (farmPollInfo.allocPoint * calculateReward * 3600n * 24n * 365n) / totalAllocPoint;
    const poolProfitValue = (poolPPIReward * ppiPrice) / precisionNumber;
    const kRatio = (k * precisionNumber) / 100n;
    const poolApr = (poolProfitValue * precisionNumber) / liquidity;
    const overallBoostRatio = (farmPollInfo.workingSupply * precisionNumber * precisionNumber) / farmPollInfo.totalSupply / kRatio;
    const aprLowerBound = (poolApr * precisionNumber) / overallBoostRatio / APR_SHARE_NUMBER;

    return aprLowerBound * 100n;
}

async function balanceOf(account: string) {
    const balanceInfo = await callContractMethod<[bigint, bigint, any]>(Provider, PoolWithBalancerContract, 'balanceOf', account);
    const totalLiquidity = await getTotalLiquidity(ETCTokenAddress);
    const totalSupply = await getPoolTotalSupply();
    const [totalBalance, unlockedBalance] = balanceInfo;
    return { totalBalance, unlockedBalance, lpPrice: (totalLiquidity * precisionNumber) / totalSupply };
}

const targetChainId = import.meta.env.MODE === 'development' ? '71' : '1030';

// not connect wallet enter page, status: in-detecting -> not-active, after call connect wallet, not-active -> in-active, after metamask click connect, in-active -> active
// connect wallet refres page, status: in-detecting -> active
function Header() {
    const account = useAccount();
    const chainId = useChainId();

    const isTargetChain = chainId === targetChainId;

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
                            switchChain('0x' + Number(targetChainId).toString(16)).catch(console.log);
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

function PoolInfoAndMyLocked() {
    const [tabIndex, setTabIndex] = useState(0);
    const switchTab = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const tabIndex = parseInt((e.target as HTMLElement).getAttribute('data-tab-index') || '0');
        setTabIndex(tabIndex);
    };
    return (
        <div className="w-full h-full pt-5 pb-[34px] pl-9 pr-5 flex flex-col">
            <div className="flex flex-row">
                <div
                    onClick={switchTab}
                    data-tab-index="0"
                    className={`py-1 px-4 flex items-center rounded-[28px] text-base leading-5 font-medium cursor-pointer ${
                        tabIndex === 0 ? 'bg-[#FFE99B]' : ''
                    }`}
                >
                    Pool Info
                </div>
                <div
                    onClick={switchTab}
                    data-tab-index="1"
                    className={`py-1 px-4 flex items-center rounded-[28px] text-base leading-5 font-medium cursor-pointer ${
                        tabIndex === 1 ? 'bg-[#FFE99B]' : ''
                    }`}
                >
                    My Locked
                </div>
            </div>
            <div className="mt-6 flex-1 overflow-hidden flex flex-row justify-stretch">
                <div
                    style={{
                        transform: `translateX(-${100 * tabIndex}%)`,
                    }}
                    className="pr-2 w-full transition-all flex-shrink-0 overflow-y-scroll scroll-bar"
                >
                    <table className="text-left w-full h-full">
                        <thead className="sticky top-0 bg-[#FFCB14]">
                            <tr className="top-0 left-0 right-0 overflow-visible ">
                                <th className="relative w-full p-0 leading-none font-medium">
                                    <span className="bottom-0 w-full h-[26px] bg-[#FFCB14] pl-4 pb-[13px] text-base leading-5 inline-block">Amount</span>
                                </th>
                                <th className="relative p-0 leading-none font-medium whitespace-nowrap">
                                    <span className="bottom-0 w-full h-[26px] bg-[#FFCB14] pb-[13px] text-base leading-5 inline-block">Unlock Time</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {Array(10)
                                .fill('$')
                                .map((_, index) => {
                                    return (
                                        <tr className="h-[48px] w-full border-b last:border-none border-current text-base leading-5" key={index}>
                                            <td className="pl-4 w-full font-black">100,000.00 LP </td>
                                            <td className=" font-medium whitespace-nowrap">2023/08/08 14:00:00</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
                <div
                    style={{
                        transform: `translateX(-${100 * tabIndex}%)`,
                    }}
                    className="pr-2 w-full transition-all flex-shrink-0 overflow-y-scroll scroll-bar"
                >
                    <table className="text-left w-full h-full">
                        <thead className="sticky top-0 bg-[#FFCB14]">
                            <tr className="top-0 left-0 right-0 overflow-visible">
                                {[
                                    {
                                        label: 'Token',
                                        className: 'pl-4 w-[130px]',
                                    },
                                    {
                                        label: 'Weight',
                                        className: 'w-[112px]',
                                    },
                                    {
                                        label: 'Balance',
                                        className: 'w-[150px]',
                                    },
                                    {
                                        label: 'Value',
                                        className: 'w-[160px]',
                                    },
                                    {
                                        label: 'Token %',
                                    },
                                ].map(({ label, className }, index) => {
                                    return (
                                        <th key={index} className="relative p-0 leading-none font-medium">
                                            <span
                                                className={`${
                                                    className || ''
                                                } w-full h-[26px] bg-[#FFCB14] pb-[13px] text-base leading-5 inline-block whitespace-nowrap`}
                                            >
                                                {label}
                                            </span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="">
                            {Array(10)
                                .fill('$')
                                .map((_, index) => {
                                    return (
                                        <tr className="h-[48px] w-full border-b last:border-none border-current text-base leading-5 font-medium" key={index}>
                                            <td className="pl-4 whitespace-nowrap">CFX</td>
                                            <td className="whitespace-nowrap">98</td>
                                            <td className="whitespace-nowrap">300.000.12</td>
                                            <td className="whitespace-nowrap">300.000.12</td>
                                            <td className="whitespace-nowrap">79.21%</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

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

    const accountPrivider = useMemo(() => {
        if (account) {
            return new BrowserProvider(window.ethereum);
        }
    }, [account]);

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
        <div className="w-[700px] h-[452px] px-5 pt-[26px] pb-5 flex flex-col rounded-[32px] text-white border border-[#D0D0D0] bg-black">
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
                        // const pairERC20Contract = new Contract(amountsAndTotalSupply?.pairAddress, ERC20ABIJSON);

                        const diff = 0.002; // 0.2%
                        const diffBigInt = BigInt(diff * 10 ** 3) * 10n ** 15n;
                        // const pairERC20ContractConnectWallet = pairERC20Contract.connect(signer);
                        // const poolAddress = await PoolWithBalancerContract.getAddress();
                        // const approveResult: TransactionResponse = await pairERC20ContractConnectWallet.getFunction('approve')(
                        //     poolAddress,
                        //     BigInt(Math.floor(Number(amount) * 10 ** 18)),
                        //     {}
                        // );
                        // const approveReceipt = await approveResult.wait();
                        // console.log({
                        //     approveResult,
                        //     approveReceipt,
                        // });

                        // const c = PoolWithBalancerContract.connect(signer);
                        // const gasLimit = await signer.estimateGas({});
                        // const result: TransactionResponse = await c.getFunction('withdraw')(
                        //     BigInt(Math.floor(Number(amount) * 10 ** 18)),
                        //     (ETCAmount * (1n * precisionNumber - diffBigInt)) / precisionNumber, // (ETCAmount * BigInt(diff * 10 ** 18)) / precisionNumber,
                        //     (CFXAmount * (1n * precisionNumber - diffBigInt)) / precisionNumber, // (CFXAmount * BigInt(diff * 10 ** 18)) / precisionNumber,
                        //     account,
                        //     Math.floor(new Date().getTime() / 1000 + 1800),
                        //     {
                        //         gasLimit: gasLimit * 100n,
                        //         gasPrice: 2n * 10n ** 11n,
                        //     }
                        // );

                        // const receipt = await result.wait();
                        // console.log({
                        //     receipt,
                        //     result,
                        // });
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
    const [modalOpen, setModalOpen] = useState(false);

    const account = useAccount();

    const { data: pairContract } = useRequest(getPairContract, {});
    const { data: farmLiquidity } = useRequest(getLiquidity, {
        defaultParams: [ETCTokenAddress],
        refreshOnWindowFocus: true
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
        refreshOnWindowFocus: true
    });

    const { data: LPbalance, run: runBalanceOf } = useRequest(balanceOf, {
        manual: true,
        refreshOnWindowFocus: true,
    });

    const { data: PPIAmountAndTotalPrice = [], run: runPPIAmount } = useRequest(
        async (account) => {
            const claimReward = await PoolWithBalancerContract.connect(Provider).getFunction('claimReward').staticCall(account);
            const PPIPrice = await getPriceBasedOnUSDT(PPITokenAddress);
            return [claimReward, (PPIPrice * claimReward) / precisionNumber] as bigint[];
        },
        {
            manual: true,
            refreshOnWindowFocus: true,
        }
    );

    const { data: amountsAndTotalSupply } = useRequest(
        async () => {
            const pairContract = await getPairContract();
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
                                        onClick={() => setModalOpen(true)}
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
                                                new BrowserProvider(window.ethereum),
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
                                <PoolInfoAndMyLocked />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {modalOpen && (
                <Modal
                    className="pt-[112px]"
                    onClick={(e) => {
                        if ((e.target as HTMLElement).getAttribute('data-modal-active') === 'close') {
                            setModalOpen(false);
                        }
                    }}
                >
                    <WithdrawForm amountsAndTotalSupply={amountsAndTotalSupply} maxAmount={LPbalance?.unlockedBalance || 0n} />
                </Modal>
            )}
        </>
    );
}

export default App;
