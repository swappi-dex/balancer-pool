import { JsonRpcProvider, Contract, Result } from 'ethers';

import PPIContract from '../contract/abi/PPIFactory.abi';
import FarmContract from '../contract/abi/SwappiFarmWeighted.abi';
import BaseFactoryContract from '../contract/abi/BaseSwappiFactoryWeighted.abi';
import RouterContract from '../contract/abi/SwappiRouterWeighted.abi';
import PoolWithBalancerContract from '../contract/abi/PoolWithBalancer.abi';
import PairContractAbi from '../contract/abi/SwappiPairWeighted.json';

import { callContractMethod } from '../contract';
import EthereumManager from '../core/EthereumManager';
import BrowserProvider from '../core/BrowserProvider';

import { CFXTokenAddress, ETCTokenAddress, FaucetUSDTAddress, PPITokenAddress } from '../contract/tokenAddress';

export const precisionNumber = 10n ** 18n;
export const pairContract = new Contract(import.meta.env.LPTokenAddress, PairContractAbi);

export const Provider = new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl);
export const accountPrivider = new BrowserProvider(new EthereumManager());

export async function getPoolTotalSupply(pairContract: Contract) {
    const totalSupply = await callContractMethod<bigint>(Provider, pairContract, 'totalSupply');
    return totalSupply;
}

export async function getNormalizedWeight0(PairContract: Contract) {
    const result = await callContractMethod<bigint>(Provider, PairContract, '_normalizedWeight0');
    return result;
}

export async function getNormalizedWeight1(PairContract: Contract) {
    const result = await callContractMethod<bigint>(Provider, PairContract, '_normalizedWeight1');
    return result;
}

export async function getPairAmounts(PairContract: Contract) {
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

export async function getPairAmountsFromTokens() {
    const amounts = await getPairAmounts(pairContract);
    return amounts;
}

// 获取 CFX 相对于 USDT 的价格 也就是相对于法币的价格
export async function getCFXPrice() {
    const pairAddress = await callContractMethod<string>(Provider, BaseFactoryContract, 'getPair', CFXTokenAddress, FaucetUSDTAddress);
    const BasePairContract = new Contract(pairAddress, PairContractAbi);
    const amounts = await getPairAmounts(BasePairContract);
    const CFXAmount = amounts.find((item) => item.address === CFXTokenAddress)!;
    const USDTAmount = amounts.find((item) => item.address === FaucetUSDTAddress)!;
    return (USDTAmount.amount * precisionNumber) / CFXAmount.amount;
}

// 获取 CFX 相对于 USDT 的价格 也就是相对于法币的价格
export async function getPriceBasedOnUSDT(tokenAdress: string) {
    const pairAddress = await callContractMethod<string>(Provider, BaseFactoryContract, 'getPair', tokenAdress, FaucetUSDTAddress);
    const BasePairContract = new Contract(pairAddress, PairContractAbi);
    const amounts = await getPairAmounts(BasePairContract);
    const CFXAmount = amounts.find((item) => item.address === tokenAdress)!;
    const USDTAmount = amounts.find((item) => item.address === FaucetUSDTAddress)!;
    return (USDTAmount.amount * precisionNumber) / CFXAmount.amount;
}

// 计算基于 CFX 下 token 价格
export async function getTokenPriceBasedOnCFX(amounts: Awaited<ReturnType<typeof getPairAmountsFromTokens>>, pairContract: Contract) {
    const index = amounts[0].address === CFXTokenAddress ? 1 : 0;
    const [normalizedWeight0, normalizedWeight1] = await Promise.all([getNormalizedWeight0(pairContract), getNormalizedWeight1(pairContract)]);
    const price = await callContractMethod<bigint>(Provider, RouterContract, 'quote', 1n * precisionNumber, amounts[index].amount, amounts[1 - index].amount, [
        normalizedWeight0,
        normalizedWeight1,
    ]);
    return price;
}

export async function getTotalLiquidity(tokenAddress: string) {
    const [amounts, CFXPrice] = await Promise.all([getPairAmountsFromTokens(), getCFXPrice()]);
    const tokenAmount = amounts.find((item) => item.address === tokenAddress)!.amount;
    const CFXAmount = amounts.find((item) => item.address === CFXTokenAddress)!.amount;
    const priceBasedOnCFX = await getTokenPriceBasedOnCFX(amounts, pairContract);
    const lpPoolTotalLiquidity = ((priceBasedOnCFX * tokenAmount + CFXAmount * 1n * precisionNumber) * CFXPrice) / 10n ** (18n + 18n);
    return lpPoolTotalLiquidity;
}

export async function getLiquidity(tokenAddress: string) {
    const [lpPoolTotalLiquidity, farmPollInfo, totalSupply] = await Promise.all([
        getTotalLiquidity(tokenAddress),
        getFarmPoolInfo(),
        getPoolTotalSupply(pairContract),
    ]);
    return (lpPoolTotalLiquidity * farmPollInfo.totalSupply) / totalSupply;
}

export async function getFarmPoolInfo() {
    const allPoolInfo = await callContractMethod<Array<[string, bigint, bigint, bigint, bigint, bigint]>>(Provider, FarmContract, 'getPoolInfo', 0);
    const pairAddress = import.meta.env.LPTokenAddress;
    const poolInfo = allPoolInfo.find((i) => i[0].toLocaleLowerCase() === pairAddress);
    const [token, allocPoint, lastRewardTime, totalSupply, workingSupply, accRewardPerShare] = poolInfo!;
    return { token, allocPoint, lastRewardTime, totalSupply, workingSupply, accRewardPerShare };
}

export async function getAPR() {
    const APR_SHARE_NUMBER = 2n;
    const start = Math.floor(new Date().getTime() / 1000);
    const [farmPollInfo, calculateReward, totalAllocPoint, ppiPrice, k, liquidity] = await Promise.all([
        getFarmPoolInfo(),
        callContractMethod<bigint>(Provider, PPIContract, 'calculateReward', start, start + 1),
        callContractMethod<bigint>(Provider, FarmContract, 'totalAllocPoint'),
        getPriceBasedOnUSDT(PPITokenAddress),
        callContractMethod<bigint>(Provider, FarmContract, 'k'),
        getPoolTotalSupply(pairContract),
    ]);

    const poolPPIReward = (farmPollInfo.allocPoint * calculateReward * 3600n * 24n * 365n) / totalAllocPoint;
    const poolProfitValue = (poolPPIReward * ppiPrice) / precisionNumber;
    const kRatio = (k * precisionNumber) / 100n;
    const poolApr = (poolProfitValue * precisionNumber) / liquidity;
    const overallBoostRatio = (farmPollInfo.workingSupply * precisionNumber * precisionNumber) / farmPollInfo.totalSupply / kRatio;
    const aprLowerBound = (poolApr * precisionNumber) / overallBoostRatio / APR_SHARE_NUMBER;

    return aprLowerBound * 100n;
}

export async function balanceOf(account: string) {
    const balanceInfo = await callContractMethod<[bigint, bigint, Result]>(Provider, PoolWithBalancerContract, 'balanceOf', account);
    const totalLiquidity = await getTotalLiquidity(ETCTokenAddress);
    const totalSupply = await getPoolTotalSupply(pairContract);
    const [totalBalance, unlockedBalance, lockedBalances] = balanceInfo;

    const lockedBalanceList = lockedBalances.toArray().map(([amount, time]) => {
        return {
            amount: amount as bigint,
            time: (time * 1000n) as bigint,
        };
    });

    return { totalBalance, unlockedBalance, lockedBalanceList, lpPrice: (totalLiquidity * precisionNumber) / totalSupply };
}
