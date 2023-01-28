import React, { useEffect }     from "react";
import WalletPicker from "./WalletPicker"
import TokenElement from "./TokenElement";
import {  toast } from 'react-toastify';
import { proposalSyntaxPlugins } from "@babel/preset-env/lib/shipped-proposals";

import "./PendingTx.css"

function WalletPendingTx(props) {
    const [walletPickerOpen, setWalletPickerOpen] = React.useState(false);
    const [importSig, setImportSig] = React.useState(false);
    const [importedTx, setImportedTx] = React.useState("");
    const [showDetails, setShowDetails] = React.useState(false);
    const [inputUtxos, setInputUtxos] = React.useState([]);
    const [collateralUtXos, setCollateralUtxos] = React.useState([]);
    const [referenceInputsUtxos,    setReferenceInputsUtxos] = React.useState([]);

    const txDetails = props.root.state.wallets[props.root.state.selectedWallet].getPendingTxDetails(props.index)
    console.log(txDetails)
    
    
    useEffect(() => {
        // get Utxo for each input
        props.wallet.getUtxosByOutRef(txDetails.inputs).then( (utxos) => {
            setInputUtxos(utxos)
            })

        txDetails.collateral ? props.wallet.getUtxosByOutRef(txDetails.collateral).then( (utxos) => {
            setCollateralUtxos(utxos)
            }) : setCollateralUtxos([])

        txDetails.reference_inputs ? props.wallet.getUtxosByOutRef(txDetails.reference_inputs).then( (utxos) => {
            setReferenceInputsUtxos(utxos)
            }) : setReferenceInputsUtxos([])

    }, [])


    function transformAmount(amount){
        const amountOut = {}
        amountOut["lovelace"] = amount.coin
        if(amount.multiasset) { 
            Object.keys(amount.multiasset).map( (policy) => {
                Object.keys(amount.multiasset[policy]).map( (asset) => {
                    amountOut[policy+asset] = parseInt(amount.multiasset[policy][asset])
                })
        })}
        return amountOut
    }

    function transactionBalance(transaction){
        const BalancesOut = {}
        inputUtxos.map( (input, index) => {
           if ( props.wallet.isAddressMine(input.address)) {
           Object.keys( input.assets).map( (asset) => 
                asset in BalancesOut ? BalancesOut[asset] -= parseInt(input.assets[asset]) :  BalancesOut[asset] = -parseInt(input.assets[asset])
            )}})

        transaction.outputs.map( (output, index) => {
            if ( props.wallet.isAddressMine(output.address)) {
                const amount = transformAmount(output.amount)
                Object.keys(amount).map( (asset) => 
                asset in BalancesOut ? BalancesOut[asset] += parseInt(amount[asset]) : BalancesOut[asset] = parseInt(amount[asset])
             )}})

        const lovelace = BalancesOut.lovelace ? BalancesOut.lovelace : 0
        delete BalancesOut["lovelace"]
        Object.keys(BalancesOut).map(item => { if(BalancesOut[item] === 0) {delete BalancesOut[item]} })
        const tokens = Object.keys(BalancesOut).map((key, index) => ( 
            <div key={index} className="transactionHistoryTokenBalance">
                <TokenElement tokenId={key} amount={BalancesOut[key]}/>
             </div>
            ) );

        return (
            <div className="transactionHistoryListBalance">
               <span className={ lovelace >= 0 ?  "transactionHistoryAdaBalance" : "transactionHistoryAdaBalanceNegative"}>
                { lovelace >= 0 ?  "+" : ""} {lovelace/1000000}
                 </span>tA 
                 {tokens}
             </div>
             )
    }

    function TransactionInput(input){
        return (
<div key={input} className="txDetailsInput">
                        <p>Transaction ID: {input.txHash}</p>
                        <p>Index: {input.outputIndex}</p>
                        <p className={props.wallet.isAddressMine(input.address) ? "txDetailsAddressMine" : "txDetailsAddressNotMine"}>Address: {input.address ? input.address : "None" }</p>
                        {input.datumHash ?  <p>datumHash: {input.datumHash ? input.datumHash : "None"}</p> : ""}
                         { input.datum ? <p>datum: {JSON.stringify(input.datum) }</p> : ""}
                        {input.scriptRef ?  <p>Script Ref: {input.scriptRef ? "None" : input.scriptRef}</p> : ""}
                        
                    {Object.keys( input.assets).map( (asset) => <div  key={asset}> <TokenElement key={input} tokenId={asset} amount={input.assets[asset]}/></div> )}
                    
                    </div>
        )
    }

    function TransactionOutput(output){
        const amount = transformAmount(output.amount)
        return (
                 
                    <div key={JSON.stringify(output)}>
                        <p className={props.wallet.isAddressMine(output.address) ? "txDetailsAddressMine" : "txDetailsAddressNotMine"}>Address: {output.address}</p>
                        {Object.keys(amount).map((key, index) => (
                            <div key={index}>
                               <TokenElement tokenId={key} amount={amount[key]}/>
                            </div>
                        ))}
                       {output.datum && <div> <p>Datum: {JSON.stringify(output.datum.Data.datum)} <br/>Original Bytes: {JSON.stringify(output.datum.Data.original_bytes)}</p></div>  }
                        {output.script_ref ? <p>Script Ref: {JSON.stringify( output.script_ref)}</p>: ""}
                    </div>
                    )
    }

    function mintToAssets(mint){
        console.log(mint)
        const assets = {}
        Object.keys(mint).map( (policy) => {
            Object.keys(mint[policy]).map( (asset) => {
                assets[policy+asset] = parseInt(mint[policy][asset])
            })
    })
    return assets
    }


    function TransactionDetails(transaction){
        const mintAssets =  transaction.mint ? mintToAssets(transaction.mint) : {}
        console.log(mintAssets)

        return (
            <div>
                <div className="txDetailsInputsOutputs">
              <div className="txDetailsInputs">
                <h3>Inputs: </h3>
                {inputUtxos.map( (input, index) => (
                    TransactionInput(input)
                        ))}
                    
                </div>
                <div className="txDetailsOutputs">
                <h3>Outputs:</h3>
                {transaction.outputs.map((output, index) => 

                    TransactionOutput(output))}
              </div>
                </div>
                <p>Fee: {transaction.fee}</p>
                { transaction.ttl && <p>TTL: {transaction.ttl}</p>}
                {transaction.network_id &&  <p>Network: {transaction.network_id}</p> }
             {transaction.certs  ?   <p>Certs: {transaction.certs.length}{transaction.certs.map(cert => {
                if (cert.StakeDelegation) {
                    return( <div key={cert}>Delegation to:{JSON.stringify(cert.StakeDelegation)}</div> )
                }if (cert.StakeRegistration) {
                    return( <div key={cert}>Stake Registration {JSON.stringify(cert.StakeRegistration)}</div> )
                }if (cert.StakeDeregistration) {
                    return( <div key={cert}>Stake Deregistration  {JSON.stringify(cert.StakeDeregistration)}</div> )
                }if (cert.PoolRegistration) {
                    return( <div key={cert}>Pool Registration {JSON.stringify(cert.PoolRegistration)}</div> )
                }if (cert.PoolRetirement) {
                    return( <div key={cert}>Pool Retirement {JSON.stringify(cert.PoolRetirement)}</div> )
                }if (cert.GenesisKeyDelegation) {
                    return( <div key={cert}>Genesis Key Delegation {JSON.stringify(cert.GenesisKeyDelegation)}</div> )
                }if (cert.MoveInstantaneousRewardsCert) {
                    return( <div key={cert}>Move Instantaneous Rewards Cert {JSON.stringify(cert.MoveInstantaneousRewardsCert)}</div> )
                                }   

             })}</p> : ""}
               {transaction.withdrawals && <p>Withdrawals: {transaction.withdrawals.map(
                    (withdrawal, index) => (
                        <div key={index}>
                            <p>Address: {withdrawal.address}</p>
                            <p>Amount: {withdrawal.amount}</p>
                        </div>
                    )
                )}</p>}
                <p>Update: {transaction.update}</p>
               {transaction.auxiliary_data_hash &&  <p>Auxiliary Data Hash: {transaction.auxiliary_data_hash}</p>}
               {transaction.validity_start_interval &&  <p>Validity Start Interval: {transaction.validity_start_interval}</p>}
               {transaction.mint && <p>Mint/Burn:               
                    {Object.keys(mintAssets).map( (asset) => <div  key={asset}> <TokenElement key={asset} tokenId={asset} amount={mintAssets[asset]}/></div> ) }</p>}
              {transaction.script_data_hash &&  <p>Script Data Hash: {transaction.script_data_hash}</p>}
              {transaction.collateral &&  <p>Collateral: {collateralUtXos.map((collateral) =>{TransactionInput(collateral)})}</p>}
               {transaction.collateral_return && <p>Collateral Return: {TransactionOutput(transaction.collateral_return)}</p> }
              { transaction.total_collateral &&   <p>Total Collateral: {transaction.total_collateral}</p> } 
              { transaction.referenceInputs &&  <p>Reference Inputs: {referenceInputsUtxos.map((referenceInput) =>
                       TransactionInput(referenceInput)  
                    )}</p>}
            {transaction.required_signers &&  <p>Required Signers: {transaction.required_signers.map((signer => <span><br/>{signer} </span>))}</p>}

                    
       

            </div>
            );
    }

    async function signWithLocalWallet(wallet){
        const api = await window.cardano[wallet].enable()
        const signature = await api.signTx(props.tx.tx.toString() ,true)
        props.root.addSignature(signature)
        
      }  
      
    function copySignature(signature){
        navigator.clipboard.writeText(signature)
        toast.info("Signature copied to clipboard")
    }

    function copyTransaction(){
        navigator.clipboard.writeText(props.tx.tx.toString())
        toast.info("Transaction copied to clipboard")
    }

    function importSigniture(){
        try{
            props.root.addSignature(importedTx);
            setImportSig(false);
        }catch(error){
            toast.error( error.message);
        }
    }

    return (
        <div className="pedningTx">
            <svg onClick={copyTransaction} className="copyIcon" id="meteor-icon-kit__solid-copy-s" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M7 5H14C15.1046 5 16 5.89543 16 7V14C16 15.1046 15.1046 16 14 16H7C5.89543 16 5 15.1046 5 14V7C5 5.89543 5.89543 5 7 5zM3 11H2C0.89543 11 0 10.1046 0 9V2C0 0.89543 0.89543 0 2 0H9C10.1046 0 11 0.89543 11 2V3H7C4.79086 3 3 4.79086 3 7V11z" fill="#758CA3"/></svg>
            {txDetails.certs && txDetails.certs.some(obj => "StakeDelegation" in obj)  ? "Delegation Transaction" : "Regular Transaxtion"} 
             
             <br/>
            {transactionBalance(txDetails)}
            {showDetails && TransactionDetails(txDetails)}
             {walletPickerOpen && <WalletPicker setOpenModal={setWalletPickerOpen} operation={signWithLocalWallet} tx={props.tx}/>}
            {txDetails.signatures.map( (item, index) => (
                <div key={index} className={"pendingTx_signer"+ (item.haveSig ? " pendingTx_signer_signed" : "")} >
                    { item.name}
                    { item.haveSig ? <span className="">Signed  <svg onClick={() => copySignature(props.wallet.getSignature(props.index,item.keyHash))} className="copyIcon" id="meteor-icon-kit__solid-copy-s" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M7 5H14C15.1046 5 16 5.89543 16 7V14C16 15.1046 15.1046 16 14 16H7C5.89543 16 5 15.1046 5 14V7C5 5.89543 5.89543 5 7 5zM3 11H2C0.89543 11 0 10.1046 0 9V2C0 0.89543 0.89543 0 2 0H9C10.1046 0 11 0.89543 11 2V3H7C4.79086 3 3 4.79086 3 7V11z" fill="#758CA3"/></svg> </span> : ""}
                </div>
            )

             )}
            
            <button onClick={ props.root.state.connectedWallet === "" ?  () => setWalletPickerOpen(true) : () => signWithLocalWallet(props.root.state.connectedWallet) } >add signature</button>
        
            <button onClick={() => props.root.submit(props.index)} >Submit</button>
            
            <button onClick={()=> setImportSig(!importSig)} >Import Signature</button>

            <button onClick={()=> props.root.removePendingTx(props.index)} >Remove</button>
            <button onClick= { () => setShowDetails(!showDetails)} >{showDetails ? "Hide" : "Show" } Details</button>
            {importSig ? 
            <div>
                <input type="text" defaultValue={importedTx} onChange={(event)=> setImportedTx(event.target.value)} placeholder="Signature Data"></input>
                  <button onClick={importSigniture}>Import</button> 
            </div> : ""      }
        </div>
    )
}

export default WalletPendingTx