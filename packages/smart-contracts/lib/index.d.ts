import { ethers } from "ethers";
import CONSTANTS from "./cli/utils/constants";
export interface Contract {
    abi: any;
    address?: string;
}
export interface EthersContracts {
    IERC20: ethers.Contract;
    IDSProxy: ethers.Contract;
    IOneSplit: ethers.Contract;
    ICurveFiCurve: ethers.Contract;
    IProxyRegistry: ethers.Contract;
    IDssCdpManager: ethers.Contract;
    IGetCdps: ethers.Contract;
    VatLike: ethers.Contract;
    OpenShortDAI: ethers.Contract;
    CloseShortDAI: ethers.Contract;
    ShortDAIActions: ethers.Contract;
}
export declare const getContract: ({ network, name, }: {
    network?: string;
    name: string;
}) => Contract;
export declare const getEthersContracts: (network: string, signerOrProvider: ethers.Signer | ethers.providers.BaseProvider) => EthersContracts;
export { CONSTANTS };
//# sourceMappingURL=index.d.ts.map