
function Tag({ className, ...rest }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>) {
    return <div className={`inline-block px-[15px] py-[3px] text-sm leading-[17px] rounded-[32px] border border-[#fff] ${className}`} {...rest} />;
}

function App() {
    return (
        <>
            <div className="min-h-full flex justify-center bg-black">
                <div className="min-w-[1440px] w-[1440px] h-[900px] px-[22px] pb-[22px] flex flex-col justify-between bg-[url('/bg-app.png')] bg-cover">
                    <div className="h-20 flex flex-row items-center">
                        <div className="w-[290px] h-10 bg-[url('/logo.svg')]"></div>
                    </div>
                    <div className="-mx-[22px] h-20 bg-[url('/title.svg')]"></div>
                    <div className="w-full h-[452px] flex flex-row justify-stretch ">
                        <div className="flex-1 flex flex-col justify-between p-5 pb-6 rounded-[32px] text-white bg-[#38A0DA]">
                            <div className="flex flex-row items-stretch">
                                <div className="relative p-2 w-28 rounded-[28px] bg-white/60">
                                    <div className='w-15 h-15 bg-cover bg-[url("/cfx-logo.png")]'></div>
                                    <div className='absolute left-11 top-2 w-15 h-15 bg-cover bg-[url("/etc-logo.png")]'></div>
                                </div>
                                <div className="ml-5 flex flex-col justify-between">
                                    <div className=" font-black text-[32px] leading-[39px]">ETC-CFX Weighted Pool</div>
                                    <div>
                                        <Tag>98%&nbsp;ETC</Tag>
                                        <Tag className="ml-2">2%&nbsp;CFX</Tag>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="mt-5 font-medium text-base leading-5">APR</div>
                                <div className="mt-2 text-[68px] leading-[83px] font-black">100.00%</div>
                                <div className="mt-5 font-medium text-base leading-5">Liquidity</div>
                                <div className="mt-2 text-[68px] leading-[83px] font-black">$100,000,000</div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-stretch">
                            <div className="flex-1 flex flex-row justify-stretch">
                                <div className="flex-1 p-5 flex flex-col rounded-[32px] text-[#000] bg-white">
                                    <div className="flex-1">
                                        <div className="text-base leading-5 font-medium">My Pool</div>
                                        <div className="mt-6 text-xl leading-[29px] font-black">100,000.00 LP</div>
                                        <div className="mt-2 text-sm leading-[17px] font-medium">~$000,000.00</div>
                                    </div>
                                    <button className="w-full py-2 px-4 h-[46px] flex items-center justify-center text-[24px] rounded-[32px] border border-current">
                                        Withdraw
                                    </button>
                                </div>
                                <div className="flex-1 p-5 flex flex-col rounded-[32px] text-white bg-[#38A0DA]">
                                    <div className="flex-1">
                                        <div className="text-base leading-5 font-medium">Rewards</div>
                                        <div className="mt-6 text-xl leading-[29px] font-black">100,000.00 PPI</div>
                                        <div className="mt-2 text-sm leading-[17px] font-medium">~$000,000.00</div>
                                    </div>
                                    <button className="w-full py-2 px-4 h-[46px] flex items-center justify-center text-[24px] rounded-[32px] border border-current">
                                        Claim
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden rounded-[32px] bg-[#FFCB14] text-black">
                                <div className="w-full h-full pt-5 pb-[34px] pl-9 pr-5 flex flex-col">
                                    <div className="flex flex-row">
                                        <div className="py-1 px-4 flex items-center rounded-[28px] text-base leading-5 font-medium">Pool Info</div>
                                        <div className="py-1 px-4 flex items-center rounded-[28px] bg-[#FFE99B] text-base leading-5 font-medium">My Locked</div>
                                    </div>
                                    <div className="mt-6 pr-2 flex-1 overflow-y-scroll scroll-bar">
                                        <table className="text-left w-full h-full">
                                            <thead className="sticky top-0 bg-[#FFCB14]">
                                                <tr className="top-0 left-0 right-0 overflow-visible">
                                                    <th className="relative w-full p-0 leading-none">
                                                        <span className="bottom-0 w-full h-[26px] bg-[#FFCB14] pl-4 pb-[13px] text-base leading-5 inline-block">
                                                            Amount
                                                        </span>
                                                    </th>
                                                    <th className="relative p-0 leading-none whitespace-nowrap">
                                                        <span className="bottom-0 w-full h-[26px] bg-[#FFCB14] pb-[13px] text-base leading-5 inline-block">
                                                            Unlock Time
                                                        </span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="">
                                                {Array(10)
                                                    .fill('$')
                                                    .map((_, index) => {
                                                        return (
                                                            <tr
                                                                className="h-[48px] w-full border-b last:border-none border-current text-base leading-5"
                                                                key={index}
                                                            >
                                                                <td className="pl-4 w-full font-black">100,000.00 LP </td>
                                                                <td className=" font-medium whitespace-nowrap">2023/08/08 14:00:00</td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
