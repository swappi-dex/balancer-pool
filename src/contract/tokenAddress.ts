const isDEV = import.meta.env.MODE === 'development';

// ETC minedToken
export const ETCTokenAddress = import.meta.env.ETCTokenAddress;
// rewardToken
export const PPITokenAddress = import.meta.env.PPITokenAddress;

export const CFXTokenAddress = isDEV ? '0x2ed3dddae5b2f321af0806181fbfa6d049be47d8' : '0x2ed3dddae5b2f321af0806181fbfa6d049be47d8';
export const FaucetUSDTAddress = isDEV ? '0x7d682e65efc5c13bf4e394b8f376c48e6bae0355' : '0x7d682e65efc5c13bf4e394b8f376c48e6bae0355';
