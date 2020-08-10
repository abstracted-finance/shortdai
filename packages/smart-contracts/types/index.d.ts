export function getContract({ network, name }: {
    network: any;
    name: any;
}): {
    abi: any;
    address?: undefined;
} | {
    abi: any;
    address: any;
};
export const CONSTANTS: {
    CONTRACT_ADDRESSES: {
        ISoloMargin: string;
        IDssProxyActions: string;
        IDssCdpManager: string;
        IProxyRegistry: string;
        IOneSplit: string;
        CurveFiSUSDv2: string;
        CurveFiY: string;
    };
    ERC20_ADDRESSES: {
        DAI: string;
        USDC: string;
    };
    ERC20_DECIMALS: {
        DAI: number;
        USDC: number;
    };
    ETH_ADDRESS: string;
};
//# sourceMappingURL=index.d.ts.map