import { useState, useCallback } from "react";
import { useActiveAccount, useSendTransaction, useWalletBalance } from "thirdweb/react";
import { prepareContractCall, readContract, toWei, waitForReceipt } from "thirdweb";
import { ethers } from "ethers";
import { ludoVaultContract, coston2, client } from "../config/web3";
import { NATIVE_CURRENCY_SYMBOL } from "../config/currency";
import { API_URL } from "../config/api";
import { PayoutProof } from "../types";
import { showToast } from "../services/toast";

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

    // G-010: mine the TX before syncing with the backend. sendTx resolves on
    // wallet SUBMIT (hash only) — the backend verifier fetches the receipt, so
    // racing it against block inclusion caused "Transaction not found" flakes.
    const confirmTx = async (transactionHash: `0x${string}`) => {
        const receipt = await waitForReceipt({ client, chain: coston2, transactionHash });
        if (receipt.status !== "success") {
            throw new Error("Transaction reverted on-chain.");
        }
        return receipt;
    };

    // G-010: surface the REAL cause in the toast (first line, trimmed) — the
    // generic message hid a dead contract address for days.
    const errorDetail = (error: unknown): string => {
        const msg = error instanceof Error ? error.message : String(error ?? "");
        const firstLine = (msg.split("\n")[0] ?? "").trim();
        return firstLine ? ` (${firstLine.slice(0, 140)})` : "";
    };

    const balance = walletBalance?.displayValue || "0";
    // PROD-4: fall back to the single currency source-of-truth rather than a
    // hardcoded string, so a chain switch (testnet → mainnet) only needs
    // one change in src/config/currency.ts.
    const balanceSymbol = walletBalance?.symbol || NATIVE_CURRENCY_SYMBOL;

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
        if (!account) return showToast("Please connect your wallet first", "error");

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
            console.log("Transaction submitted:", txHash);
            await confirmTx(txHash);
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
            showToast(`Failed to create room${errorDetail(error)}`, "error");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // 5. Join Room Flow
    const handleJoinGame = async (roomId: string, stakeAmount: string | number, playerName: string, color: string) => {
        if (!account) return showToast("Please connect your wallet first", "error");

        setIsProcessing(true);
        try {
            const amountInWei = toWei(stakeAmount.toString());

            // Step B1: Verify Room Status on Blockchain (Prevent InvalidRoomStatus revert)
            // G-010/G-011: the old `ludoVaultContract.read.*` calls threw on every
            // run (thirdweb v5 contracts have no `.read`), so this check silently
            // never worked. Real readContract now — a friendly error BEFORE the
            // wallet opens beats an on-chain revert after.
            console.log("Checking room status on-chain...");
            try {
                const roomInfo = await readContract({
                    contract: ludoVaultContract,
                    method: "function rooms(bytes32) view returns (address, uint256, uint256, uint256, uint256, uint8)",
                    params: [roomId as `0x${string}`],
                });
                const maxPlayers = Number(roomInfo[1]);
                const status = Number(roomInfo[5]);

                const participants = await readContract({
                    contract: ludoVaultContract,
                    method: "function getParticipants(bytes32) view returns (address[])",
                    params: [roomId as `0x${string}`],
                });

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
            console.log("Join transaction submitted:", txHash);
            await confirmTx(txHash);
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
            showToast(`Failed to join the match${errorDetail(error)}`, "error");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // 6. Claim Winnings Flow
    const handleClaimPayout = async (payoutProof: PayoutProof) => {
        if (!account) return showToast("Please connect your wallet first", "error");

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
            // G-011 (Daniel-Review): mine the claim before declaring success —
            // sendTx resolves on wallet submit, so an on-chain revert (expired
            // deadline, replayed nonce) would otherwise still show "PAYOUT SENT!".
            await confirmTx(result.transactionHash);
            console.log("Payout claimed successfully!", result);
            // Kein Success-Toast: VictoryCelebration zeigt bereits prominent
            // "PAYOUT SENT!" — ein Toast wäre doppeltes Feedback.
            return result;
        } catch (error) {
            console.error("Payout Claim Error:", error);
            showToast(`Failed to claim winnings${errorDetail(error)}`, "error");
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
