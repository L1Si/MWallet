import {  Utils , C , Lucid, Blockfrost ,ExternalWallet  } from "./lucid/dist/esm/mod.js";
import Datasource  from "./Datasource";
const { Transaction} = C;

const data1 = await Datasource.from_blockfrost("preprodLZ9dHVU61qVg6DSoYjxAUmIsIMRycaZp")

class Wallet {
    // Initialize the wallet with the provided script and address
    constructor(wallet_json,name) {
    //   const address =  Address.from_bech32("addr_test1qpy8h9y9euvdn858teawlxuqcnf638xvmhhmcfjpep769y60t75myaxudjacwd6q6knggt2lwesvc7x4jw4dr8nmmcdsfq4ccf") // L
            
    //   const address2 =  Address.from_bech32("addr_test1qpceptsuy658a4tjartjqj29fhwgwnfkq2fur66r4m6fpc73h7m9jt9q7mt0k3heg2c6sckzqy2pvjtrzt3wts5nnw2q9z6p9m") // Trash

    //   let mintingScripts =  NativeScripts.new()
    //   mintingScripts.add( NativeScript.new_script_pubkey( ScriptPubkey.new( BaseAddress.from_address(address).payment_cred().to_keyhash())))
    //   mintingScripts.add( NativeScript.new_script_pubkey( ScriptPubkey.new( BaseAddress.from_address(address2).payment_cred().to_keyhash())))
    //   console.log(NativeScript.new_script_all( ScriptAll.new(mintingScripts)).to_json())
    //   this.wallet_script = NativeScript.new_script_all( ScriptAll.new(mintingScripts))
      this.signersNames = []
       
      this.wallet_script = wallet_json
      this.wallet_address = "";
      this.name=name
      this.pendingTxs = [];
      
    }

    extractSignerNames(json) {
      for (const key in json) {
        if (json.hasOwnProperty(key)) {
          const element = json[key];
          if (element.type === "sig"){
            this.signersNames.push( { hash:element.keyHash , name:element.name})
            if (element.keyHash.substring(0, 5)=== "addr_"){
              
              element.keyHash=this.utils.getAddressDetails(element.keyHash).paymentCredential.hash
            }
          } else if (typeof element === 'object') {
            this.extractSignerNames(element);
          } 
        }
      }
    }

    keyHashToSighnerName(keyHash){
      for(var index=0; index< this.signersNames.length; index++){
        if (this.signersNames[index].hash == keyHash){
          let name=this.signersNames[index].name
          return name
        };
      }
    }

    async initialize (){
      this.lucid = await Lucid.new(
        new Blockfrost("https://cardano-preprod.blockfrost.io/api/v0", "preprodLZ9dHVU61qVg6DSoYjxAUmIsIMRycaZp"),
        "Preprod",
      );
      this.utils = new Utils(this.lucid)
      this.extractSignerNames(this.wallet_script)

      this.lucidNativeScript = this.utils.nativeScriptFromJson(this.wallet_script )
      this.lucid.selectWalletFrom(  { "address":this.getAddress()})
      await this.loadUtxos()

      console.log(this.lucidNativeScript)
    }

    getScript() {
      return this.wallet_script;
    }

    getName(){
      return this.name
    }
    getSignatures(){
      return this.signatures;
    }

    getBalance(){
      const utxos = this.utxos
      let result = 0
      utxos.map( utxo => {
        result += Number( utxo.assets.lovelace)
      }

      )
      return result
   }

   getBalanceFull(){
    const utxos = this.utxos
    let result = {}
    utxos.map( utxo => {
      console.log(utxo)
      for (var asset in  utxo.assets ) {
        console.log(asset)
        asset in result ? result[asset] +=  utxo.assets[asset] : result[asset] =   utxo.assets[asset]
      } }
      )
    return result
 }

 async getTransactionHistory(){
   let txList= await this.lucid.provider.getTransactions(this.getAddress())
   console.log(txList)
   let result = []
   for(let index =0 ; index < txList.length; index++){
    console.log(txList[index])
     result.push(await this.lucid.provider.getTransactionDetails(txList[index].tx_hash))
   }
   return result    
 }

    getAddress() {
        const rewardAddress = this.utils.validatorToScriptHash(this.lucidNativeScript)
        return this.utils.validatorToAddress(this.lucidNativeScript, {type:"Script", hash: rewardAddress} )
    }
 
    getSigners(){
      return this.signersNames
    }
    async getUtxos() {
        return this.utxos
    }
   
    async loadUtxos() {
      this.utxos = await this.lucid.provider.getUtxos(this.getAddress())
    }
    
    getPendingTxs(){
        return this.pendingTxs
    }

    decodeTransaction(tx){
      const uint8Array = new Uint8Array(tx.toString().match(/.{2}/g).map(byte => parseInt(byte, 16)));
      const txBody =  Transaction.from_bytes(uint8Array).body().to_js_value()
  
      return txBody

    }

    getPendingTxDetails(index){
      const txDetails = this.decodeTransaction(this.pendingTxs[index].tx)
      txDetails.signatures = txDetails.required_signers.map( (keyHash) => (
        {name: this.keyHashToSighnerName(keyHash) , keyHash:keyHash , haveSig: (keyHash in this.pendingTxs[index].signatures ? true : false)}
      ))
      return txDetails
    }

    checkSigners(signers){
        const json=this.wallet_script
        return checkRoot(json)


        function checkAll(json){
              for (var index = 0; index < json.length; index++){

                if (!checkRoot(json[index]) ){
                  return false;
                }
              }
              return true
          }

        function checkAny(json){
            for (var index = 0; index < json.length; index++){

              if (checkRoot(json[index]) ){
                return true;
              }
            }
            return false
        }

        function checkAtLeast(json,required){
          var sigs=0;
          for (var index = 0; index < json.length; index++){

            if (checkRoot(json[index]) ){
               sigs++
               
            }
            if(sigs >= required){
              return true
            }
            
          }
          return false
       }
        

        function checkSig(json){

            if( signers.includes( json.keyHash))
              return true
            else
              return false
        }

        function checkRoot(json) {
            switch (json.type) {
              case "all": 
                    return checkAll(json.scripts)
                    break;
              case "any": 
                    return checkAny(json.scripts)
                    break;
              case "atLeast":
                    return  checkAtLeast(json.scripts,json.required)
                    break;
              case "sig":
                    return checkSig(json)
                    break;
     
   
          }}
      }

      
    
    
    async createTx(amount, destination, signers){ 
      console.log(`Creating transaction of ${amount} Lovelace, for address: ${destination}`)

      if (!this.checkSigners(signers)){
        console.log("Not enough signers")
        return "Not enough signers"
      }

      const tx = this.lucid.newTx()

      signers.map( value => (
        tx.addSignerKey(value)
      ))
      
      const completedTx = await tx.attachSpendingValidator(this.lucidNativeScript)
      .payToAddress(destination,{lovelace: amount*1000000})
      .complete()
      
      this.pendingTxs.push({tx:completedTx, signatures:{}})
      return "Sucsess"
    }

    async createDelegationTx(pool, signers){ 
      console.log(`Creating delegation transaction for pool: ${pool}`)
      const rewardAddress = this.utils.validatorToRewardAddress(this.lucidNativeScript)
      if (!this.checkSigners(signers)){
        console.log("Not enough signers")
        return "Not enough signers"
      }

      const tx = this.lucid.newTx()

      signers.map( value => (
        tx.addSignerKey(value)
      ))
      
      const completedTx = await tx.payToAddress(this.getAddress(),{lovelace: 5000000})
      //  .delegateTo(rewardAddress,pool)
      .attachSpendingValidator(this.lucidNativeScript)
      .delegateTo(rewardAddress,pool)
      .complete()
      
      this.pendingTxs.push({tx:completedTx, signatures:[]})
      return "Sucsess"
    }

    decodeSignature(signature){
      console.log(signature)

      
      const witness  =  C.TransactionWitnessSet.from_bytes(this.hexToBytes(signature))
      const signer = witness.vkeys().get(0).vkey().public_key().hash().to_hex()
      console.log(witness.to_js_value())
      console.log() 

      console.log(this.signersNames)
      return {signer: signer , witness : witness}     
    }
    hexToBytes(hex) {
      for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
      return bytes;
    }
    
    async addSignature(signature){
      const signatureInfo = this.decodeSignature(signature)
      this.signersNames.some(obj => obj.keyHash === signatureInfo.signer);

      for (var index = 0; index < this.pendingTxs.length; index++){
            this.pendingTxs[index] 
            if (signatureInfo.witness.vkeys().get(0).vkey().public_key().verify( this.hexToBytes(this.pendingTxs[index].tx.toHash()), signatureInfo.witness.vkeys().get(0).signature()))
            {
              !(signatureInfo.signer in this.pendingTxs[index].signatures) ? this.pendingTxs[index].signatures[signatureInfo.signer] = (signature)  : console.log("This signature already exists");
            }

        }

    }

    async submitTransaction(index){
       const tx = this.pendingTxs[index]
       const signedTx = await tx.tx.assemble(Object.values(tx.signatures)).complete();
       const txHash = await signedTx.submit();
       this.pendingTxs = this.pendingTxs.filter( (item,i) => i!==index)
       console.log(txHash);

    }
    // Setters
    setScript(wallet_script) {
      this.wallet_script = wallet_script;
    }
    
    setAddress(wallet_address) {
      this.wallet_address = wallet_address;
    }

  }

  export default Wallet;