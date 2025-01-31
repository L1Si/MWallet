import React, { useEffect }     from "react";
import WalletPicker from "./WalletPicker"
import TokenElement from "./TokenElement";
import {  toast } from 'react-toastify';
import { ReactComponent as SignIcon } from "../html/assets/sign.svg";
import { ReactComponent as ImportSigIcon } from "../html/assets/importSig.svg";
import { ReactComponent as ExpandIcon } from "../html/assets/details.svg";
import copyTextToClipboard from "../helpers/copyTextToClipboard";
import "./PendingTx.css"
import { C } from "lucid-cardano";

function WalletPendingTx(props) {
    const [ hovering, setHovering] = React.useState("");
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
            console.log("collateral", utxos, "collateral")
            setCollateralUtxos(utxos)
            }) : setCollateralUtxos([])

        txDetails.reference_inputs ? props.wallet.getUtxosByOutRef(txDetails.reference_inputs).then( (utxos) => {
            console.log("reference_inputs", utxos, "reference_inputs")
            setReferenceInputsUtxos(utxos)
            }) : setReferenceInputsUtxos([])

    }, [])


    function transformAmount(amount){
        const amountOut = {}
        amountOut["lovelace"] = amount.coin
        if(amount.multiasset) { 
            Object.keys(amount.multiasset).map( (policy) => {
                Object.keys(amount.multiasset[policy]).map( (asset) => {
                    amountOut[policy+asset] = BigInt(amount.multiasset[policy][asset])
                })
        })}
        return amountOut
    }

    function transactionBalance(transaction){
        const BalancesOut = {}
        inputUtxos.map( (input, index) => {
           if ( props.wallet.isAddressMine(input.address)) {
           Object.keys( input.assets).map( (asset) => 
                asset in BalancesOut ? BalancesOut[asset] -= BigInt(input.assets[asset]):  BalancesOut[asset] =- BigInt(input.assets[asset])
            )}})

        transaction.outputs.map( (output, index) => {
            if ( props.wallet.isAddressMine(output.address)) {
                const amount = transformAmount(output.amount)
                Object.keys(amount).map( (asset) => 
                asset in BalancesOut ? BalancesOut[asset] += BigInt(amount[asset]) : BalancesOut[asset] = BigInt(amount[asset])
             )}})
        if(transaction.withdrawals) {
             if(transaction.withdrawals.hasOwnProperty(props.wallet.getStakingAddress()) ) {
                console.log("In withdrawals")
                BalancesOut["lovelace"] -= BigInt(transaction.withdrawals[props.wallet.getStakingAddress()])
            }
        }

        const lovelace =BalancesOut.lovelace ?  BigInt( BalancesOut.lovelace)  : 0n
        delete BalancesOut["lovelace"]
        Object.keys(BalancesOut).map(item => { if(BalancesOut[item] === 0n) {delete BalancesOut[item]} })
        const tokens = Object.keys(BalancesOut).map((key, index) => ( 
            <div key={index} className="transactionHistoryTokenBalance">
                <TokenElement key={index} tokenId={key} amount={Number(BalancesOut[key])}  />
             </div>
            ) );

        
        
        return inputUtxos.length !== 0 ? (
            <div className="transactionHistoryListBalance">
               <span className={ lovelace >= 0n ?  "transactionHistoryAdaBalance" : "transactionHistoryAdaBalanceNegative"}>
                { lovelace >= 0n ?  "+" : ""} {Number(lovelace)/1000000}
                 </span>tA 
                 {tokens}
             </div>
             ) : <div className="transactionHistoryListBalance"> </div>
    }

    function TransactionInput(input){
        return (
<div key={input.txHash+input.outputIndex} className="txDetailsInput">
                         <p > <span className={props.wallet.isAddressMine(input.address) ? "txDetailsAddressMine" : "txDetailsAddressNotMine"}> {input.address ? input.address : "None" }</span> <br/>
                          Transaction ID: {input.txHash} | Index: {input.outputIndex}</p>
                    {Object.keys( input.assets).map( (asset,index) => <div className="pendingTxTokenContainer"  key={index}> <TokenElement key={input} tokenId={asset} amount={input.assets[asset]}/></div> )}
                        
                        {input.datumHash &&  <div className="pendingTxData"> <p > <h4>Datum Hash:</h4><span >  {input.datumHash}</span> </p> </div>}
                         { input.datum &&<div className="pendingTxData"> <p > <h4>Datum:</h4> <span > {JSON.stringify(input.datum,null,2) }</span> </p> </div>}
                        {input.scriptRef &&  <div className="pendingTxData"> <p > <h4>Script Reference:</h4><span >  { JSON.stringify(input.scriptRef,null,2)}</span></p> </div> }
              </div>
        )
    }

    function TransactionOutput(output){
        const amount = transformAmount(output.amount)
        return (
                 
                    <div key={JSON.stringify(output)} className="txDetailsOutput">
                        <p className={props.wallet.isAddressMine(output.address) ? "txDetailsAddressMine" : "txDetailsAddressNotMine"}>{output.address}</p>
                        {Object.keys(amount).map((key, index) => (
                            <div className="pendingTxTokenContainer" key={index}>
                               <TokenElement tokenId={key} amount={amount[key]}/>
                            </div>
                        ))}
                       {output.datum && <div className="pendingTxData"> <p > <h4>Datum:</h4> <span>{JSON.stringify(output.datum, null, 2)} </span> </p></div>  }
                        {output.script_ref &&<div className="pendingTxData">  <p>  <h4>Script Ref:</h4> <span>{JSON.stringify( output.script_ref, null, 2)}</span> </p></div>}
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
                    <div className="txDetailsSmall">
                <p><h3>Fee:</h3> {transaction.fee / 1_000_000}tA</p>
                { transaction.ttl && <p><h3>TTL:</h3> {transaction.ttl}</p>}
                {transaction.network_id &&  <p> <h3>Network:</h3> {transaction.network_id}</p> }
                    </div>
                <div className="txDetailsMain">
             {transaction.certs  ?   <div className="pendingTxData"> <p > <h4>Certificates:</h4> <span> {transaction.certs.map(cert => {
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

                            })}</span></p></div> : ""}

               {transaction.withdrawals && <div className="pendingTxData"> <p > <h4>Withdrawals: </h4> <span> {JSON.stringify( transaction.withdrawals)} </span></p> </div>}
               {transaction.update &&  <div className="pendingTxData"> <p > <h4> Update:</h4> <span>  {transaction.update} </span></p> </div> }
               {transaction.auxiliary_data_hash && <div className="pendingTxData"> <p > <h4>Auxiliary Data Hash:</h4> <span>  {transaction.auxiliary_data_hash} </span></p> </div>}
                {transaction.validity_start_interval &&  <div className="pendingTxData"> <p > <h4>Validity Start Interval: </h4> <span>  {transaction.validity_start_interval} </span></p> </div>}

              {transaction.script_data_hash &&  <div className="pendingTxData"> <p > <h4>Script Data Hash: </h4> <span>  {transaction.script_data_hash} </span></p> </div>}

              {transaction.collateral && <div key={collateralUtXos}> <p > <span>  {collateralUtXos.map((input, index) =>{ TransactionInput(input)})} </span></p> </div>}
              
              {transaction.collateral_return && <div className="pendingTxData"> <p > <h4>Collateral Return: </h4> <span>  {TransactionOutput(transaction.collateral_return)} </span></p> </div>}
              { transaction.total_collateral &&   <div className="pendingTxData"> <p > <h4>Total Collateral: </h4> <span>  {transaction.total_collateral} </span></p> </div> } 
              {transaction.invalid_before &&  <div className="pendingTxData"> <p > <h4>Invalid Before:</h4> <span>  {transaction.invalid_before} </span></p> </div>}
              {transaction.invalid_hereafter &&  <div className="pendingTxData"> <p > <h4>Invalid Hereafter:  </h4> <span> {transaction.invalid_hereafter} </span></p> </div>}
              {transaction.required_scripts &&  <div className="pendingTxData"> <p > <h4>Required Scripts: </h4> <span>  {transaction.required_scripts.map((script) => <div key={script}> {script}</div>)} </span></p> </div>}                         

              {collateralUtXos.length !== 0  && <div  className="pendingTxReferenceInputs"> <p > <h3>Collateral: </h3> <span> {collateralUtXos.map((input, index) =>
                         TransactionInput(input)
                         )} </span></p> </div>}
              

              { transaction.reference_inputs !== null &&  <div className="pendingTxReferenceInputs"> <p > <h3>Reference Inputs: </h3> <span >  {referenceInputsUtxos.map((referenceInput) =>
                       TransactionInput(referenceInput)  
                    )} </span></p> </div>}
            {transaction.required_signers &&  <div className="pendingTxData"> <p > <h4>Required Signers: </h4> <span className="pendingTxsDetailsSigners">   {transaction.required_signers.map((signer => <div key={signer}>{signer} </div>))} </span></p> </div>}
            {transaction.mint && <div > <p > <h4> Mint/Burn: </h4>                
                    {Object.keys(mintAssets).map( (asset) => <div  key={asset}> <TokenElement key={asset} tokenId={asset} amount={mintAssets[asset]}/></div> ) } </p> </div>}
                    
       
            </div>
            </div>
            );
    }

    async function signWithLocalWallet(wallet){
        try{
        const api = await window.cardano[wallet].enable()
        const signature = await api.signTx(props.tx.tx.toString() ,true)
        props.root.addSignature(signature)
        }catch(error){
            toast.error("Error signing with local wallet: " + error.info)
        }
      }  
      
    function copySignature(signature){
        copyTextToClipboard(signature)
        toast.info("Signature copied to clipboard")
    }

    function copyTransaction(){
        copyTextToClipboard(props.tx.tx.toString())
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

    function signTransaction(){
    console.log(props.root.state.connectedWallet.name)
    console.log("reeeeeeee")
      if( props.root.state.connectedWallet.name === "" ) 
        setWalletPickerOpen(true) 
    else
        signWithLocalWallet(props.root.state.connectedWallet.name)

    }

    return (
        <div className="pedningTx">
     <div className='deleteRecipientWrapper'>
            <div   > <button className='deleteRecipient' type="submit" onClick={ ()=> props.root.removePendingTx(props.index)}>x</button> </div>
      </div>


            <svg onClick={copyTransaction} className="copyIcon" id="meteor-icon-kit__solid-copy-s" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M7 5H14C15.1046 5 16 5.89543 16 7V14C16 15.1046 15.1046 16 14 16H7C5.89543 16 5 15.1046 5 14V7C5 5.89543 5.89543 5 7 5zM3 11H2C0.89543 11 0 10.1046 0 9V2C0 0.89543 0.89543 0 2 0H9C10.1046 0 11 0.89543 11 2V3H7C4.79086 3 3 4.79086 3 7V11z" fill="#758CA3"/></svg>
            {txDetails.certs && txDetails.certs.some(obj => "StakeDelegation" in obj)  ? "Delegation Transaction" : "Regular Transaxtion"} 
             
             <br/>
            {inputUtxos.length !== 0 ? transactionBalance(txDetails) : ""}
             {walletPickerOpen && <WalletPicker setOpenModal={setWalletPickerOpen} operation={signWithLocalWallet} tx={props.tx}/>}

            <div className="pendingTx_signers">
            <h4 >Signatures:</h4>
            {txDetails.signatures.map( (item, index) => (
                <div key={index} className={"pendingTx_signer"+ (item.haveSig ? " pendingTx_signer_signed" : "")} >
                   
                    {item.haveSig ? <span className="pendingTxCompletedSig">{item.name} Signed <svg className="copyIcon" onClick={() => copySignature(props.wallet.getSignature(props.index,item.keyHash))}  id="meteor-icon-kit__solid-copy-s" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M7 5H14C15.1046 5 16 5.89543 16 7V14C16 15.1046 15.1046 16 14 16H7C5.89543 16 5 15.1046 5 14V7C5 5.89543 5.89543 5 7 5zM3 11H2C0.89543 11 0 10.1046 0 9V2C0 0.89543 0.89543 0 2 0H9C10.1046 0 11 0.89543 11 2V3H7C4.79086 3 3 4.79086 3 7V11z" fill="#758CA3"/></svg> </span> :
                      <span className="pendingTxMissingSig"> Signature missing for: {item.name}</span> }
                </div>))}


            {showDetails && TransactionDetails(txDetails)}
            </div>
            <div className="pendingTx_buttons">
            <div  onMouseEnter={() => setHovering("sign")} onMouseLeave={() => setHovering("") } onClick={signTransaction}  className='iconWraper detailsButton'>
                <SignIcon className="icon"  alt="signicon" />
                {  hovering === "sign" &&  <label className='iconLabel'>Sign</label> }
            </div>  
              
            <div  onMouseEnter={() => setHovering("Submit")} onMouseLeave={() => setHovering("") } onClick={() => props.root.submit(props.index)}  className='iconWraper detailsButton'>
                <SignIcon className="icon"  alt="signicon" />
                {  hovering === "Submit" &&  <label className='iconLabel'>Submit</label> }
            </div>  
              
            <div  onMouseEnter={() => setHovering("importSig")} onMouseLeave={() => setHovering("") } onClick={()=> setImportSig(!importSig)}  className='iconWraper importSigButton'>
                <ImportSigIcon className="icon"  alt="signicon" />
                {  hovering === "importSig" &&  <label className='iconLabel'>Import Signature</label> }
            </div>  
              
            <div  onMouseEnter={() => setHovering("Details")} onMouseLeave={() => setHovering("") } onClick={() => setShowDetails(!showDetails)}  className='iconWraper txDetailsButton'>
                <ExpandIcon className="icon"  alt="signicon" />
                {  hovering === "Details" &&  <label className='iconLabel'>{showDetails ? "Hide" : "Show" } Details</label> }
            </div>  
                </div>
   
            

            {importSig ? 
            <div>
                <input type="text" defaultValue={importedTx} onChange={(event)=> setImportedTx(event.target.value)} placeholder="Signature Data"></input>
                  <button onClick={importSigniture}>Import</button> 
            </div> : ""      }
        </div>
    )
}

export default WalletPendingTx