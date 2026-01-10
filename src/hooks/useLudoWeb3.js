import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction, useWalletBalance } from "thirdweb/react";
import { prepareContractCall, toWei, readContract, sendAndConfirmTransaction } from "thirdweb";
import { ethers } from "ethers";
import { goTokenContract, ludoVaultContract, LUDO_VAULT_ADDRESS, coston2, client } from "../config/web3";

export const useLudoWeb3 = () => {
    const account = useActiveAccount();
    const { mutateAsync: sendTx } = useSendTransaction();
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. Check Native C2FLR Balance
    const { data: walletBalance } = useWalletBalance({
        chain: coston2,
        address: account?.address,
        client: client,
    });

    const balance = walletBalance?.displayValue || "0";
    const balanceSymbol = walletBalance?.symbol || "C2FLR";

    const refetchBalance = () => {
        // Handled by hook polling
    };


    // 3. Sync with Backend
    const syncWithBackend = async (endpoint, body) => {
        try {
            const res = await fetch(`http://localhost:3333/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Server returned ${res.status}: ${text.substring(0, 100)}`);
            }

            return await res.json();
        } catch (error) {
            console.error("Backend Sync Error:", error);
            throw error; // Rethrow so caller knows it failed
        }
    };

    // 4. Create Room Flow
    const handleCreateRoom = async (stakeAmount, maxPlayers, creatorName, color) => {
        if (!account) return alert("Please connect wallet first");

        setIsProcessing(true);
        try {
            const amountInWei = toWei(stakeAmount.toString());
            const roomId = ethers.id("Room_" + Date.now() + Math.random());

            // Step B: Create Room on Blockchain (PAYABLE)
            console.log("Creating room on blockchain with native currency...");
            const createTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function createRoom(bytes32,uint256)",
                params: [roomId, amountInWei],
                value: amountInWei, // Send native C2FLR
            });
            await sendTx(createTx);

            // Step C: Register Room in Backend Lobby
            console.log("Registering room in backend...");
            await syncWithBackend('rooms/create', {
                roomId,
                stake: stakeAmount,
                maxPlayers,
                creatorName,
                creatorAddress: account.address,
                color
            });

            alert("Room created successfully!");
            refetchBalance();
            return roomId;
        } catch (error) {
            console.error("Create Room Failed:", error);
            alert("Failed to create room.");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // 5. Join Room Flow
    const handleJoinGame = async (roomId, stakeAmount, playerName, color) => {
        if (!account) return alert("Please connect wallet first");

        setIsProcessing(true);
        try {
            const amountInWei = toWei(stakeAmount.toString());

            // Step B: Join Room on Blockchain (PAYABLE)
            console.log("Joining room on blockchain with native currency...");
            const joinTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function joinRoom(bytes32)",
                params: [roomId],
                value: amountInWei, // Send native C2FLR
            });
            await sendTx(joinTx);

            // Step C: Update Backend
            console.log("Updating backend lobby...");
            const result = await syncWithBackend('rooms/join', {
                roomId,
                playerName,
                playerAddress: account.address,
                color
            });

            alert(`Successfully joined room!`);
            refetchBalance();
            return result;

        } catch (error) {
            console.error("Join Room Failed:", error);
            alert("Failed to join Web3 game.");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // 6. Claim Winnings Flow
    const handleClaimPayout = async (payoutProof) => {
        if (!account) return alert("Please connect wallet first");

        setIsProcessing(true);
        try {
            console.log("Claiming payout with signature...");

            const claimTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function claimPayout(bytes32,address,uint256,uint256,uint256,bytes)",
                params: [
                    payoutProof.roomId,
                    payoutProof.winner,
                    BigInt(payoutProof.amount),
                    BigInt(payoutProof.nonce),
                    BigInt(payoutProof.deadline),
                    payoutProof.signature
                ],
            });

            const result = await sendTx(claimTx);
            console.log("Payout claimed successfully!", result);
            alert("Congratulations! Your winnings have been transferred to your wallet.");
            refetchBalance();
            return result;
        } catch (error) {
            console.error("Payout Claim Error:", error);
            alert("Failed to claim winnings. Check if you are the winner or if signature expired.");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        account,
        balance,
        balanceSymbol,
        isProcessing,
        handleCreateRoom,
        handleJoinGame,
        handleClaimPayout,
        refetchBalance
    };
};
