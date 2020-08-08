import { createContainer } from 'unstated-next'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useToasts } from '@zeit-ui/react'
import useLocalStorageState from 'use-local-storage-state'

declare global {
  interface Window {
    ethereum: Provider | undefined
  }
}

type Provider = ethers.providers.Provider
type Signer = ethers.Signer

function useWeb3() {
  const [, setToasts] = useToasts()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [signer, setSigner] = useState<Signer | null>(null)
  const [network, setNetwork] = useState<any>(null)
  const [ethAddress, setEthAddress] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [connectedBefore, setHasConnectedBefore] = useLocalStorageState<
    boolean
  >('connected-web3-prior', false)

  const connected = provider !== null

  const attemptConnection = async () => {
    if (window.ethereum === undefined) {
      throw Error('MetaMask not found')
    }

    // get provider and signer
    const provider = new ethers.providers.Web3Provider(window.ethereum as any)
    const signer = provider.getSigner()
    const network = await provider.getNetwork()

    // get address
    await provider.send('eth_requestAccounts', null)
    const address = await signer.getAddress()

    setProvider(provider)
    setSigner(signer)
    setNetwork(network)
    setEthAddress(address)

    setHasConnectedBefore(true)
  }

  const connect = async () => {
    setIsConnecting(true)
    try {
      setError(null)
      await attemptConnection()

      // Update on accounts change
      window.ethereum.on('accountsChanged', () => {
        attemptConnection()
      })
    } catch (error) {
      setError(error)
      setToasts({
        text: 'Unable to connect to web3',
        type: 'error',
      })
    }
    setIsConnecting(false)
  }

  useEffect(() => {
    if (connectedBefore) {
      connect()
    }
  }, [])

  return {
    connected,
    provider,
    signer,
    network,
    ethAddress,
    connect,
    isConnecting,
    error,
  }
}

export default createContainer(useWeb3)
