import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import solc from 'solc';
import { createEVM } from '@ethereumjs/evm'; import { createAccount, createAddressFromString, hexToBytes, bytesToHex } from '@ethereumjs/util';
import { RPCStateManager } from '@ethereumjs/statemanager';
import { encodeDeployData, encodeFunctionData, decodeFunctionResult, toFunctionSelector } from 'viem';
assert.equal(toFunctionSelector('placeOrderFor(address,bool,uint64,uint256,uint256,uint64,uint8,uint8,address,uint96)'), '0x80054449');
const files=['ExperimentalPlacementGuard.sol','Mocks.sol'];const sources=Object.fromEntries(files.map(name=>[name,{content:fs.readFileSync(new URL(name,import.meta.url),'utf8')}]));
const compiled=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},viaIR:true,evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}})));
const errors=(compiled.errors??[]).filter(e=>e.severity==='error'); if(errors.length)throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
const artifact=(file,name)=>compiled.contracts[file][name];
class EmptyForkState extends RPCStateManager {
 async commit() { this._caches.commit(); }
 async getAccountFromProvider() { return createAccount({}); }
 async getStorage(address,key) { return this._caches.storage.get(address,key) ?? new Uint8Array(); }
 async getCode(address) { return this._caches.code.get(address)?.code ?? new Uint8Array(); }
}
for (const backend of ['default', 'rpc-cache']) test(`guard atomically enforces observed net changes against mock protocol (${backend})`,{timeout:30000},async()=>{
 const stateManager = backend === 'rpc-cache' ? new EmptyForkState({provider:'http://127.0.0.1:1',blockTag:1n}) : undefined;
 const evm=await createEVM(stateManager ? {stateManager} : {});const owner='0x00000000000000000000000000000000000000aa',payer='0x00000000000000000000000000000000000000bb',caller=createAddressFromString(owner);
 await evm.stateManager.putAccount(caller,createAccount({balance:10n**18n}));
 async function deploy(file,name,args=[]) {const a=artifact(file,name),data=encodeDeployData({abi:a.abi,bytecode:'0x'+a.evm.bytecode.object,args}),r=await evm.runCall({caller,gasLimit:10000000n,data:hexToBytes(data)});assert.equal(r.execResult.exceptionError,undefined);return {address:r.createdAddress.toString(),abi:a.abi};}
 const token=await deploy('Mocks.sol','MockToken'),bank=await deploy('Mocks.sol','MockBank',[token.address]),pool=await deploy('Mocks.sol','MockPool',[bank.address,token.address]),guard=await deploy('ExperimentalPlacementGuard.sol','ExperimentalPlacementGuard',[pool.address,bank.address,token.address]);
 async function call(c,functionName,args=[]) {const data=encodeFunctionData({abi:c.abi,functionName,args});return evm.runCall({caller,to:createAddressFromString(c.address),gasLimit:10000000n,data:hexToBytes(data)});}
 async function write(c,name,args) {const r=await call(c,name,args);assert.equal(r.execResult.exceptionError,undefined,`${name}: ${r.execResult.exceptionError?.error}`);}
 async function read(c,name,args) {const r=await call(c,name,args);assert.equal(r.execResult.exceptionError,undefined);return decodeFunctionResult({abi:c.abi,functionName:name,data:bytesToHex(r.execResult.returnValue)});}
 await write(token,'setBalance',[owner,100n]);await write(token,'setBalance',[payer,100n]);await write(bank,'setFree',[owner,100n]);await write(bank,'setPayer',[owner,payer]);
 const deadline=4000000000n,expiry=deadline*1000000000n; const place=limits=>call(guard,'place',[true,10n,1n,expiry,deadline,limits]);
 assert.ok((await place([2n,3n,5n,100n])).execResult.exceptionError,'operator permission required');
 await write(pool,'approveGuard',[guard.address]);await write(pool,'configure',[2n,3n,-5n,true,false]);const accepted=await place([2n,3n,5n,100n]);assert.equal(accepted.execResult.exceptionError,undefined, `revert data: ${bytesToHex(accepted.execResult.returnValue)}`);
 assert.equal(await read(token,'balanceOf',[owner]),98n);assert.equal(await read(token,'balanceOf',[payer]),97n);assert.equal(await read(bank,'free',[owner]),95n);
 for(const [a,b,d,l] of [[3n,0n,0n,[2n,0n,0n,100n]],[0n,4n,0n,[0n,3n,0n,100n]],[0n,0n,-6n,[0n,0n,5n,100n]]]) {await write(pool,'configure',[a,b,d,true,false]);assert.ok((await place(l)).execResult.exceptionError);assert.equal(await read(token,'balanceOf',[owner]),98n);assert.equal(await read(token,'balanceOf',[payer]),97n);assert.equal(await read(bank,'free',[owner]),95n);}
 await write(pool,'configure',[0n,0n,0n,true,false]);await write(pool,'configurePosition',[3n]);assert.ok((await place([0n,0n,0n,2n])).execResult.exceptionError,'position size cap');assert.equal(await read(bank,'size',[owner]),0n,'position change rolls back');assert.equal((await place([0n,0n,0n,3n])).execResult.exceptionError,undefined);await write(bank,'setSize',[owner,-3n]);await write(pool,'configurePosition',[-1n]);assert.ok((await place([0n,0n,0n,3n])).execResult.exceptionError,'short absolute size cap');assert.equal(await read(bank,'size',[owner]),-3n);assert.equal((await place([0n,0n,0n,4n])).execResult.exceptionError,undefined);await write(bank,'setSize',[owner,0n]);await write(pool,'configurePosition',[0n]);
 await write(pool,'configure',[0n,0n,0n,false,false]);assert.ok((await place([0n,0n,0n,100n])).execResult.exceptionError,'silent rejection');
 await write(pool,'configure',[0n,0n,0n,true,true]);assert.ok((await place([0n,0n,0n,100n])).execResult.exceptionError,'payer changed');assert.equal((await read(bank,'payer',[owner])).toLowerCase(),payer);
 await write(pool,'configure',[0n,0n,0n,true,false]);
 await write(bank,'setSize',[owner,5n]); await write(pool,'configurePosition',[-2n]);
 assert.equal((await place([0n,0n,0n,3n])).execResult.exceptionError,undefined,'reduction to cap is accepted');
 assert.equal(await read(bank,'size',[owner]),3n);
 await write(pool,'configurePosition',[1n]); assert.ok((await place([0n,0n,0n,3n])).execResult.exceptionError,'increase over cap is rejected');
 assert.equal(await read(bank,'size',[owner]),3n,'rejected increase rolls back');
 await write(pool,'approveGuard',['0x0000000000000000000000000000000000000000']);
 assert.ok((await place([0n,0n,0n,100n])).execResult.exceptionError,'revoked operator permission rejects');
 assert.equal(await read(bank,'size',[owner]),3n,'revocation leaves position unchanged');
 assert.ok((await call(guard,'place',[true,10n,1n,expiry,0n,[0n,0n,0n,100n]])).execResult.exceptionError,'expired review');
});
