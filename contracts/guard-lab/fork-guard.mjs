// Local fork compatibility experiment. Every state change is in-memory; RPC is read-only.
import fs from 'node:fs'; import solc from 'solc';
import { createEVM } from '@ethereumjs/evm'; import { RPCStateManager } from '@ethereumjs/statemanager';
import { createCustomCommon, Hardfork, Mainnet } from '@ethereumjs/common';
import { createAccount, createAddressFromString, createZeroAddress, hexToBytes, bytesToHex } from '@ethereumjs/util';
import { createPublicClient, http, keccak256, parseAbi, encodeDeployData, encodeFunctionData, decodeFunctionResult, toFunctionSelector } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
const blockNumber=34494972n, bank='0x478769e1177c0773c43a593dccc4ad15f15f1394', pool='0xd6cb1dd58580b84d76068ac21594219ce03aeddf', owner='0x249e79De269e54a901A3d2Ce660496563103b470', token='0xed7993a74dae1e6656b704a424dcd8711aaf4f72', registry='0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a';
const url=hidekiTestnet.rpcUrls.default.http[0], client=createPublicClient({chain:hidekiTestnet,transport:http(url)});
class ForkState extends RPCStateManager { async commit() { this._caches.commit(); } async getAccountFromProvider(address) { const a=address.toString(); const [balance,nonce,code]=await Promise.all([client.getBalance({address:a,blockNumber}),client.getTransactionCount({address:a,blockNumber}),client.getBytecode({address:a,blockNumber})]); return createAccount({balance,nonce:BigInt(nonce),codeHash:hexToBytes(keccak256(code??'0x'))}); } }
function compile(){const source=fs.readFileSync(new URL('ExperimentalPlacementGuard.sol',import.meta.url),'utf8');const output=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'ExperimentalPlacementGuard.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},viaIR:true,evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));const errors=(output.errors??[]).filter(e=>e.severity==='error');if(errors.length)throw new Error(errors.map(e=>e.formattedMessage).join('\n'));return output.contracts['ExperimentalPlacementGuard.sol'].ExperimentalPlacementGuard;}
async function main(){
 const block=await client.getBlock({blockNumber}), common=createCustomCommon({chainId:50383},Mainnet,{hardfork:Hardfork.Cancun}),state=new ForkState({provider:url,blockTag:blockNumber,common}),evm=await createEVM({common,stateManager:state}),caller=createAddressFromString(owner);
 const context={header:{number:blockNumber,timestamp:block.timestamp,coinbase:createZeroAddress(),difficulty:0n,prevRandao:new Uint8Array(32),gasLimit:block.gasLimit,baseFeePerGas:block.baseFeePerGas??0n,getBlobGasPrice:()=>undefined}};
 const a=compile(), data=encodeDeployData({abi:a.abi,bytecode:'0x'+a.evm.bytecode.object,args:[pool,bank,token]});
 const deploy=await evm.runCall({caller,data:hexToBytes(data),gasLimit:15000000n,block:context});
 if(deploy.execResult.exceptionError)throw new Error('Local guard creation failed: '+deploy.execResult.exceptionError.error);
 const guard=deploy.createdAddress.toString(); console.log('Local guard created in fork only',guard);
 async function call(address,abi,functionName,args) { const input=encodeFunctionData({abi,functionName,args});const r=await evm.runCall({caller,to:createAddressFromString(address),data:hexToBytes(input),gasLimit:15000000n,block:context});if(r.execResult.exceptionError)throw new Error(`${functionName} failed in fork: ${r.execResult.exceptionError.error}; ${bytesToHex(r.execResult.returnValue)}`);return r; }
 const permissionAbi=parseAbi(['function setOperatorApprovalForPool(address pool,address operator,bytes4[] selectors,bool approved)','function isApprovedForPool(address pool,address owner,address operator,bytes4 selector) view returns (bool)']);
 await call(registry,permissionAbi,'setOperatorApprovalForPool',[pool,guard,['0x80054449'],true]);
 const check=await call(registry,permissionAbi,'isApprovedForPool',[pool,owner,guard,'0x80054449']);
 if(!decodeFunctionResult({abi:permissionAbi,functionName:'isApprovedForPool',data:bytesToHex(check.execResult.returnValue)}))throw new Error('Fork operator approval did not take effect.');
 console.log('Operator permission granted in fork only.');
 const tokenAbi=parseAbi(['function approve(address spender,uint256 amount) returns (bool)','function allowance(address,address) view returns (uint256)','function balanceOf(address) view returns (uint256)','function transferFrom(address,address,uint256) returns (bool)']);const bankAbi=parseAbi(['function deposit(uint256 amount)','function getAccountState(address) view returns ((int256 unlockedCollateralBalance,uint256 lockedCollateral,address[] activePerpPools))','function getPosition(address,address) view returns ((int128 size,uint128 avgEntryPrice,int256 entryFundingIndex,uint64 lastUpdatedTimestampNs))']);
 await call(token,tokenAbi,'approve',[bank,3000000000000000000n]); const allowanceResult=await call(token,tokenAbi,'allowance',[owner,bank]); const balanceResult=await call(token,tokenAbi,'balanceOf',[owner]); console.log('Fork wallet allowance',decodeFunctionResult({abi:tokenAbi,functionName:'allowance',data:bytesToHex(allowanceResult.execResult.returnValue)}).toString(),'balance',decodeFunctionResult({abi:tokenAbi,functionName:'balanceOf',data:bytesToHex(balanceResult.execResult.returnValue)}).toString()); await state.checkpoint(); try { const transfer=encodeFunctionData({abi:tokenAbi,functionName:'transferFrom',args:[owner,bank,2000000000000000000n]}); const t=await evm.runCall({caller:createAddressFromString(bank),to:createAddressFromString(token),data:hexToBytes(transfer),gasLimit:15000000n,block:context}); console.log('Direct token transferFrom fork test:',t.execResult.exceptionError?.error ?? 'success'); } finally { await state.revert(); } await call(bank,bankAbi,'deposit',[2000000000000000000n]); console.log('Paper collateral prepared in fork only.');
 const readPosition=async()=>{const r=await call(bank,bankAbi,'getPosition',[owner,pool]);return decodeFunctionResult({abi:bankAbi,functionName:'getPosition',data:bytesToHex(r.execResult.returnValue)});};
 const initial=await readPosition(); const initialAbsolute=initial.size<0n ? -initial.size : initial.size;
 const deadline=block.timestamp+600n,expiry=deadline*1000000000n,qty=4000000000000000n;
 const attempt=async(maxSize)=>{const data=encodeFunctionData({abi:a.abi,functionName:'place',args:[true,2400000000000000000000n,qty,expiry,deadline,[0n,0n,2000000000000000000n,maxSize]]});return evm.runCall({caller,to:createAddressFromString(guard),data:hexToBytes(data),gasLimit:15000000n,block:context});};
 const beforeWallet=decodeFunctionResult({abi:tokenAbi,functionName:'balanceOf',data:bytesToHex((await call(token,tokenAbi,'balanceOf',[owner])).execResult.returnValue)});
 const beforeAccount=decodeFunctionResult({abi:bankAbi,functionName:'getAccountState',data:bytesToHex((await call(bank,bankAbi,'getAccountState',[owner])).execResult.returnValue)});
 const tight=await attempt(initialAbsolute); const afterTight=await readPosition();
 console.log('Tight position cap:',tight.execResult.exceptionError?.error??'accepted', 'position before',initial.size.toString(),'after',afterTight.size.toString());
 if (!tight.execResult.exceptionError) throw new Error('Tight cap did not revert; this run did not demonstrate cap enforcement.');
 if (bytesToHex(tight.execResult.returnValue).slice(0,10)!==toFunctionSelector('LimitExceeded()')) throw new Error(`Tight placement reverted for a different reason: ${bytesToHex(tight.execResult.returnValue)}`);
 if(afterTight.size!==initial.size) throw new Error('A tight-cap test unexpectedly changed position; cannot treat this as a valid check.');
 const afterWallet=decodeFunctionResult({abi:tokenAbi,functionName:'balanceOf',data:bytesToHex((await call(token,tokenAbi,'balanceOf',[owner])).execResult.returnValue)});
 const afterAccount=decodeFunctionResult({abi:bankAbi,functionName:'getAccountState',data:bytesToHex((await call(bank,bankAbi,'getAccountState',[owner])).execResult.returnValue)});
 if (beforeWallet!==afterWallet || beforeAccount.unlockedCollateralBalance!==afterAccount.unlockedCollateralBalance || beforeAccount.lockedCollateral!==afterAccount.lockedCollateral) throw new Error('Tight cap changed wallet or margin state after revert.');
 const wide=await attempt(initialAbsolute+qty);
 if(wide.execResult.exceptionError) throw new Error('Wide-cap IOC placement failed in fork: '+wide.execResult.exceptionError.error+'; '+bytesToHex(wide.execResult.returnValue));
 const afterWide=await readPosition();
 console.log('Wide-cap IOC placement succeeded in fork; position after',afterWide.size.toString(),'logs',wide.execResult.logs?.length??0);
 if(afterWide.size===initial.size) throw new Error('No position change occurred; this run did not demonstrate position-cap enforcement.');
 console.log('Local-only simulation; no transaction or approval was sent to the network.');
}
main().catch(e=>{console.error(e?.shortMessage??e?.message??String(e));process.exitCode=1});
