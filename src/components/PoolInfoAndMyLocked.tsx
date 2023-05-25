import { useState } from 'react';
import { balanceOf, getCFXPrice, getPairAmountsFromTokens, getPairWeightFromTokens, getTokenPriceBasedOnCFX, pairContract, precisionNumber } from '../service';
import { formatNumberWithDecimals, formatNumberWithDecimals8 } from '../utils';
import { useRequest } from 'ahooks';
import { CFXTokenAddress, ETCTokenAddress } from '../contract/tokenAddress';

interface PoolInfoAndMyLockedProps {
    lockedBalanceList?: Awaited<ReturnType<typeof balanceOf>>['lockedBalanceList'];
}

export default function PoolInfoAndMyLocked({ lockedBalanceList = [] }: PoolInfoAndMyLockedProps) {
    const [tabIndex, setTabIndex] = useState(0);

    const { data: infos = [] } = useRequest(
        async () => {
            const [amounts, weights, CFXPrice] = await Promise.all([getPairAmountsFromTokens(), getPairWeightFromTokens(), getCFXPrice()]);

            const priceBasedOnCFX = await getTokenPriceBasedOnCFX(amounts, pairContract);

            const totalAmount = amounts.map((i) => i.amount).reduce((a, b) => a + b, 0n);

            const infos = amounts.map((item) => {
                const isCFX = item.address === CFXTokenAddress;
                return {
                    name: isCFX ? 'CFX' : 'ETC',
                    icon: isCFX ? '/cfx-logo.png' : '/etc-logo.png',
                    weight: weights.find((i) => i.address === item.address)!.weight,
                    value: (item.amount * (isCFX ? precisionNumber : priceBasedOnCFX) * CFXPrice) / precisionNumber / precisionNumber,
                    percent: (item.amount * precisionNumber) / totalAmount,
                    ...item,
                };
            });

            return infos;
        },
        {
            pollingInterval: 1200,
        }
    );

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
                    <table className="text-left w-full">
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
                            {infos.map(({ icon, name, weight, amount, value, percent }, index) => {
                                return (
                                    <tr className="h-[48px] w-full border-b last:border-none border-current text-base leading-5 font-medium" key={index}>
                                        <td className="pl-4 whitespace-nowrap">
                                            <div className="flex flex-row items-center">
                                                <img className="w-6" src={icon} />
                                                <span className="ml-1">{name}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap">{formatNumberWithDecimals8(weight * 100n)}%</td>
                                        <td className="whitespace-nowrap">{formatNumberWithDecimals(amount)}</td>
                                        <td className="whitespace-nowrap">{formatNumberWithDecimals(value)}</td>
                                        <td className="whitespace-nowrap">{formatNumberWithDecimals(percent * 100n)}%</td>
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
                    <table className="text-left w-full">
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
                            {lockedBalanceList.map(({ amount, time }, index) => {
                                return (
                                    <tr className="h-[48px] w-full border-b last:border-none border-current text-base leading-5" key={index}>
                                        <td className="pl-4 w-full font-black">{formatNumberWithDecimals8(amount)} LP </td>
                                        <td className=" font-medium whitespace-nowrap">{new Date(Number(time)).toLocaleString()}</td>
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
