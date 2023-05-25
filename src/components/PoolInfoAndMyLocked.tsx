import { useState } from "react";
import { balanceOf } from "../service";
import { formatNumberWithDecimals8 } from "../utils";

interface PoolInfoAndMyLockedProps {
    pololInfo?: Array<{
        icon: string;
        name: string;
        weight: bigint;
        balance: bigint;
        value: bigint;
        percent: bigint;
    }>;
    lockedBalanceList?: Awaited<ReturnType<typeof balanceOf>>['lockedBalanceList'];
}

export default function PoolInfoAndMyLocked({ lockedBalanceList = [] }: PoolInfoAndMyLockedProps) {
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