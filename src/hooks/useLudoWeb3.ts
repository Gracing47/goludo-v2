import { useState, useCallback } from "react";
import { useActiveAccount, useSendTransaction, useWalletBalance } from "thirdweb/react";
import { prepareContractCall, toWei } from "thirdweb";
import { ethers } from "ethers";
import { ludoVaultContract, coston2, client } from "../config/web3";
import { API_URL } from "../config/api";
import { PayoutProof } from "../types";

/**
 * useLudoWeb3 Hook
 * 
 * Manages Web3 interactions including room creation, joining, and payout claims.
 * Handles transaction state and backend synchronization.
 */
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

    const refetchBalance = useCallback(() => {
        // Handled by hook polling automatically if data is accessed
    }, []);

    // 3. Sync with Backend
    const syncWithBackend = async (endpoint: string, body: any) => {
        try {
            const res = await fetch(`${API_URL}/api/${endpoint}`, {
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
            throw error;
        }
    };

    // 4. Create Room Flow
    const handleCreateRoom = async (stakeAmount: string | number, maxPlayers: number, creatorName: string, color: string, mode: string = 'classic') => {
        if (!account) return alert("Please connect wallet first");

        setIsProcessing(true);
        try {
            const amountInWei = toWei(stakeAmount.toString());
            const roomId = ethers.id("Room_" + Date.now() + Math.random());

            // Step B: Create Room on Blockchain (PAYABLE)
            console.log("Creating room on blockchain with native currency...");
            const createTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function createRoom(bytes32,uint256,uint256)",
                params: [roomId as `0x${string}`, amountInWei, BigInt(maxPlayers)],
                value: amountInWei, // Send native C2FLR
            });

            const txResult = await sendTx(createTx);
            const txHash = txResult.transactionHash;
            console.log("Transaction confirmed:", txHash);

            // Step C: Register Room in Backend Lobby
            await syncWithBackend('rooms/create', {
                roomId,
                txHash,
                stake: stakeAmount,
                maxPlayers,
                creatorName,
                creatorAddress: account.address,
                color,
                mode
            });

            console.log("✅ Room created successfully!", roomId);
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
    const handleJoinGame = async (roomId: string, stakeAmount: string | number, playerName: string, color: string) => {
        if (!account) return alert("Please connect wallet first");

        setIsProcessing(true);
        try {
            const amountInWei = toWei(stakeAmount.toString());

            // Step B1: Verify Room Status on Blockchain (Prevent InvalidRoomStatus revert)
            console.log("Checking room status on-chain...");
            try {
                // @ts-ignore
                const roomInfo = await ludoVaultContract.read.rooms([roomId as `0x${string}`]);
                // roomInfo is [creator, maxPlayers, entryAmount, pot, createdAt, status]
                const maxPlayers = Number(roomInfo[1]);
                const status = Number(roomInfo[5]);

                // Fetch current participants count
                // @ts-ignore
                const participants = await ludoVaultContract.read.getParticipants([roomId as `0x${string}`]);

                if (status === 0) throw new Error("Room does not exist on the smart contract.");
                if (status !== 1) throw new Error(`Cannot join: Room status is ${status === 2 ? 'ACTIVE' : 'INACTIVE'}.`);
                if (participants.length >= maxPlayers) throw new Error("Room is already full.");
            } catch (err: any) {
                console.warn("Pre-join status check failed:", err.message);
                if (err.message.includes("Room does not exist") || err.message.includes("Cannot join")) {
                    throw err;
                }
                // Continue if it's just a RPC error, let the transaction try
            }

            // Step B2: Join Room on Blockchain (PAYABLE)
            console.log("Joining room on blockchain with native currency...");
            const joinTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function joinRoom(bytes32)",
                params: [roomId as `0x${string}`],
                value: amountInWei, // Send native C2FLR
            });
            const txResult = await sendTx(joinTx);
            const txHash = txResult.transactionHash;
            console.log("Join transaction confirmed:", txHash);

            // Step C: Update Backend
            const result = await syncWithBackend('rooms/join', {
                roomId,
                txHash,
                playerName,
                playerAddress: account.address,
                color
            });

            console.log("✅ Successfully joined room:", result);
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
    const handleClaimPayout = async (payoutProof: PayoutProof) => {
        if (!account) return alert("Please connect wallet first");

        setIsProcessing(true);
        try {
            console.log("Claiming payout with signature...");

            const claimTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function claimPayout(bytes32,address,uint256,uint256,uint256,bytes)",
                params: [
                    payoutProof.roomId as `0x${string}`,
                    payoutProof.winner as `0x${string}`,
                    BigInt(payoutProof.amount),
                    BigInt(payoutProof.nonce),
                    BigInt(payoutProof.deadline),
                    payoutProof.signature as `0x${string}`
                ],
            });

            const result = await sendTx(claimTx);
            console.log("Payout claimed successfully!", result);
            alert("Congratulations! Your winnings have been transferred to your wallet.");
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
