// Optional local fork exploration: all writes go to the in-memory EVM, never RPC.
import { createEVM } from '@ethereumjs/evm';
import { RPCStateManager } from '@ethereumjs/statemanager';
import { createCustomCommon, Hardfork, Mainnet } from '@ethereumjs/common';
import { createAccount, createAddressFromString, createZeroAddress, hexToBytes, bytesToHex } from '@ethereumjs/util';
import { createPublicClient, http, keccak256, parseAbi, encodeFunctionData, decodeFunctionResult } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
const blockNumber=34494972n, bank='0x478769e1177c0773c43a593dccc4ad15f15f1394', owner='0x249e79De269e54a901A3d2Ce660496563103b470';
const url=hidekiTestnet.rpcUrls.default.http[0], client=createPublicClient({chain:hidekiTestnet,transport:http(url)});
class ForkState extends RPCStateManager {
 async getAccountFromProvider(address) {
  const a=address.toString();
  const [balance,nonce,code]=await Promise.all([client.getBalance({address:a,blockNumber}),client.getTransactionCount({address:a,blockNumber}),client.getBytecode({address:a,blockNumber})]);
  return createAccount({balance,nonce:BigInt(nonce),codeHash:hexToBytes(keccak256(code ?? '0x'))});
 }
}
async function main(){
 const block=await client.getBlock({blockNumber});
 const common=createCustomCommon({chainId:50383},Mainnet,{hardfork:Hardfork.Cancun});
 const stateManager=new ForkState({provider:url,blockTag:blockNumber,common});
 const evm=await createEVM({common,stateManager});
 const context={header:{number:blockNumber,timestamp:block.timestamp,coinbase:createZeroAddress(),difficulty:0n,prevRandao:new Uint8Array(32),gasLimit:block.gasLimit,baseFeePerGas:block.baseFeePerGas??0n,getBlobGasPrice:()=>undefined}};
 const abi=parseAbi(['function getAccountState(address) view returns ((int256 unlockedCollateralBalance, uint256 lockedCollateral, address[] activePerpPools))']);
 const input=encodeFunctionData({abi,functionName:'getAccountState',args:[owner]});
 const res=await evm.runCall({caller:createAddressFromString(owner),to:createAddressFromString(bank),data:hexToBytes(input),gasLimit:10000000n,block:context});
 if(res.execResult.exceptionError) throw new Error('Fork execution failed: '+res.execResult.exceptionError.error);
 const state=decodeFunctionResult({abi,functionName:'getAccountState',data:bytesToHex(res.execResult.returnValue)});
 const direct=await client.readContract({address:bank,abi,functionName:'getAccountState',args:[owner],blockNumber});
 if(state.unlockedCollateralBalance!==direct.unlockedCollateralBalance || state.lockedCollateral!==direct.lockedCollateral) throw new Error('Fork state does not match RPC read.');
 console.log('Fork read matched RPC at block',blockNumber.toString(),'; bank account state fields match. No transaction sent.');
}
main().catch(e=>{console.error(e?.shortMessage??e?.message??String(e));process.exitCode=1});
