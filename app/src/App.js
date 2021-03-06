import './App.css';
import openseaLogo from './assets/opensea-logo.svg';
import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { ABI, CONTRACT_ADDRESS, OPENSEA_LINK } from './utils/contract';

const TOTAL_MINT_COUNT = 40;
const PRICE = '0.1';
const WORKER_URL = 'https://nft-api.sliponit9471.workers.dev' // 'http://127.0.0.1:8787'

const tokenAddress = id => `https://testnets.opensea.io/assets/${CONTRACT_ADDRESS}/${id}`

const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [total, setTotal] = useState(0);
  const [tokens, setTokens] = useState([])
  
  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: 'eth_accounts' });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account);
      // Setup listener! This is for the case where a user comes to our site
      // and ALREADY had their wallet connected + authorized.
      setupEventListener()
    } else {
      console.log("No authorized account found");
    }
  }

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask!");
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);

      // Setup listener! This is for the case where a user comes to our site
      // and connected their wallet for the first time. TODO?? double with state
      setupEventListener() 
    } catch (error) {
      console.log(error)
    }
  }

  // Setup our listener.
  const setupEventListener = async () => {
    await fetchData();
    // Most of this looks the same as our function askContractToMintNft
    try {
      const { ethereum } = window;

      if (ethereum) {
        // Same stuff again
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        // THIS IS THE MAGIC SAUCE.
        // This will essentially "capture" our event when our contract throws it.
        // If you're familiar with webhooks, it's very similar to that!
        connectedContract.on("NewEpicNFTMinted", (from, tokenId) => {
          console.log(from, tokenId.toNumber())
          if (!tokens.map(token => token.minter).includes(currentAccount)) {
            alert(`Hey there! We've minted your NFT and sent it to your wallet. It may be blank right now. It can take a max of 10 min to show up on OpenSea. Here's the link: ${tokenAddress(tokenId.toNumber())}`)
          }
        });

        console.log("Setup event listener!")
        // TODO?? move
        const total = await connectedContract.getTotalNFTsMintedSoFar();
        setTotal(total.toNumber());
        console.log("Retrieved total count...", total.toNumber());
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const askContractToMintNft = async () => {
    try {
      const { ethereum } = window;
      const id = total;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const connectedContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        const { cid } = await fetchCid(id)

        console.log("Going to pop wallet now to pay gas...")
        let nftTxn = await connectedContract.makeAnEpicNFT(cid, { value: ethers.utils.parseEther(PRICE) });

        console.log("Mining...please wait.")
        await nftTxn.wait();
        console.log(nftTxn);
        console.log(`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTxn.hash}`);
        await postMinter({ id, minter: currentAccount })
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error)
    }
  }

  const postMinter = async ({ id, minter }) => {
    const headers = {
      'X-API-KEY': process.env.REACT_APP_X_API_KEY,
      'content-type': 'application/json'
    }
    const response = await fetch(WORKER_URL + '/minter', { method: 'POST', headers, body: JSON.stringify({ id, minter }) });
    return response.json()
  }

  const fetchCid = async (id) => {
    const response = await fetch(WORKER_URL + '/cid/' + id);
    return response.json()
  }

  const fetchData = async () => {
    const response = await fetch(WORKER_URL + '/data');
    const data = await response.json()
    setTokens(data.tokens)
  }

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  // Render Methods
  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet} className="cta-button connect-wallet-button">
      Connect to Wallet
    </button>
  );

  const renderMintUI = () => (
    <div>
      <p className="sub-text">
       { total } / { TOTAL_MINT_COUNT } SCCs have been minted
      </p>
      {tokens.map(t => t.minter).includes(currentAccount) ? 
        <p className="sub-text">You already minted one!</p> :
        (total < TOTAL_MINT_COUNT ?
        <button onClick={askContractToMintNft} className="cta-button connect-wallet-button">
          Mint NFT
        </button> :
        <p className="sub-text">Sold out</p>)
      }
    </div>
  )

  const renderMinted = () => (
    tokens.map((token, id) => // 
      <div className="column" key={id}>
        <div className="content">
          <a href={tokenAddress(id)} target="blank_">
            <img src={WORKER_URL + '/svg/' + id} alt={token.id} className="img-cent" />
          </a>
          <p className="footer-text">{`SCC #${id} ${token.state}`}</p>
        </div>
      </div>
    )
  )

  const renderPrinciple = () => (
    <div className="body-container">
      <ul>
        <li>Vision: Create a fun experience to learn not to buy/sell NFTs too fast, i.e. before a good night sleep</li>
        <li>A NFT collection of 40 Sleepy Cartoon Characters on the Ethereum blockchain (Rinkeby testnet)</li>
        <li>Each character has a unique sleeping duration between 9 and 48 hours.</li>
        <li>The sleeping duration depends on the traits of the character, e.g. a smiling characters needs less sleep than a sad one. Rare characters have a red element and the longest sleeping need!</li>
        <li>This sleeping duration needs to be respected between buying a NFT and listing it for sale.</li>
        <li>Otherwise the character goes in hibernation between 9 and 48 days!</li>
        <li>When a characters is asleep, it appears with a grey background. When it hibernates, it goes black!</li>
        <li>One mint (0.1 ETH) per wallet. The minter wallet address appears as a watermark on the NFT image.</li>
      </ul>
    </div>
  )

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header gradient-text">Sleepy Cartoon Characters</p>
          <p className="sub-text">
            A NFT collection of 40 Sleepy Cartoon Characters
          </p>
          {currentAccount === "" ? renderNotConnectedContainer() : renderMintUI()}
        </div>
        {tokens.length && <h2 className="sub-text">Gallery</h2>}
        <div className="row">
          {renderMinted()}
        </div>
        <h2 className="sub-text">Principle</h2>
        {renderPrinciple()}
        <div className="footer-container">
          <img alt="Opensea Logo" className="opensea-logo" src={openseaLogo} />
          <a
            className="footer-text"
            href={OPENSEA_LINK}
            target="_blank"
            rel="noreferrer"
          >View collection</a>
        </div>
      </div>
    </div>
  );
};

export default App;