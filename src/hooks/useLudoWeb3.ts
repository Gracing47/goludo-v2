import { useState, useCallback, useEffect } from "react";
import { useActiveAccount, useSendTransaction, useWalletBalance } from "thirdweb/react";
import { prepareContractCall, readContract, toWei, waitForReceipt } from "thirdweb";
import { ethers } from "ethers";
import { ludoVaultContract, goTokenContract, coston2, client, LUDO_VAULT_ADDRESS } from "../config/web3";
import { NATIVE_CURRENCY_SYMBOL, STAKE_CURRENCY_SYMBOL } from "../config/currency";
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

    // G-025: stakes are $GO (ERC-20) now — the native balance above is gas-only.
    const [goBalanceWei, setGoBalanceWei] = useState<bigint>(0n);
    const refreshGoBalance = useCallback(async () => {
        if (!account?.address) { setGoBalanceWei(0n); return; }
        try {
            const bal = await readContract({
                contract: goTokenContract,
                method: "function balanceOf(address) view returns (uint256)",
                params: [account.address],
            });
            setGoBalanceWei(bal as bigint);
        } catch { /* RPC hiccup — keep last value */ }
    }, [account?.address]);

    useEffect(() => {
        refreshGoBalance();
        const t = setInterval(refreshGoBalance, 15000);
        return () => clearInterval(t);
    }, [refreshGoBalance]);

    // Display value, trimmed to 4 decimals ("12.5" not "12.500000000000000001")
    const goBalance = (() => {
        try { return parseFloat(parseFloat(ethers.formatEther(goBalanceWei)).toFixed(4)).toString(); }
        catch { return "0"; }
    })();

    // G-025: the $GO vault pulls stakes via transferFrom — one MaxUint256
    // approval per wallet, then every create/join works without extra popups.
    const ensureAllowance = async (amountInWei: bigint) => {
        const allowance = await readContract({
            contract: goTokenContract,
            method: "function allowance(address,address) view returns (uint256)",
            params: [account!.address, LUDO_VAULT_ADDRESS],
        }) as bigint;
        if (allowance >= amountInWei) return;
        showToast(`One-time approval: allow the vault to escrow your $${STAKE_CURRENCY_SYMBOL} stakes…`, "info");
        const approveTx = prepareContractCall({
            contract: goTokenContract,
            method: "function approve(address,uint256) returns (bool)",
            params: [LUDO_VAULT_ADDRESS, ethers.MaxUint256],
        });
        const txResult = await sendTx(approveTx);
        await confirmTx(txResult.transactionHash);
    };

    // G-025: friendly pre-check — an empty $GO wallet should hit the faucet,
    // not an opaque on-chain revert.
    const ensureGoBalance = async (amountInWei: bigint) => {
        const bal = await readContract({
            contract: goTokenContract,
            method: "function balanceOf(address) view returns (uint256)",
            params: [account!.address],
        }) as bigint;
        if (bal < amountInWei) {
            throw new Error(`Not enough $${STAKE_CURRENCY_SYMBOL} for this stake — grab free testnet $${STAKE_CURRENCY_SYMBOL} from the faucet in the lobby.`);
        }
    };

    const refetchBalance = useCallback(() => {
        // Native balance: handled by hook polling automatically if data is accessed
        refreshGoBalance();
    }, [refreshGoBalance]);

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

            // Step A (G-025): $GO balance + allowance — the new vault escrows the
            // stake via transferFrom, the old payable/native flow reverts on it.
            await ensureGoBalance(amountInWei);
            await ensureAllowance(amountInWei);

            // Step B: Create Room on Blockchain ($GO stake, affiliate = none)
            console.log("Creating room on blockchain with $GO stake...");
            const createTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function createRoom(bytes32,uint256,uint256,address)",
                params: [roomId as `0x${string}`, amountInWei, BigInt(maxPlayers), ethers.ZeroAddress as `0x${string}`],
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
                // G-025: new $GO-vault Room struct — (creator, maxPlayers, entryAmount,
                // pot, createdAt, affiliate, status). The old 6-tuple decoded garbage.
                const roomInfo = await readContract({
                    contract: ludoVaultContract,
                    method: "function rooms(bytes32) view returns (address, uint256, uint256, uint256, uint256, address, uint8)",
                    params: [roomId as `0x${string}`],
                });
                const maxPlayers = Number(roomInfo[1]);
                const status = Number(roomInfo[6]); // 0=EMPTY 1=WAITING 2=ACTIVE 3=FINISHED 4=CANCELLED

                const participants = await readContract({
                    contract: ludoVaultContract,
                    method: "function getParticipants(bytes32) view returns (address[])",
                    params: [roomId as `0x${string}`],
                });

                if (status === 0) throw new Error("Room does not exist on the smart contract.");
                if (status !== 1) throw new Error(`Cannot join: Room status is ${status === 2 ? 'ACTIVE' : status === 4 ? 'CANCELLED' : 'INACTIVE'}.`);
                if (participants.length >= maxPlayers) throw new Error("Room is already full.");
            } catch (err: any) {
                console.warn("Pre-join status check failed:", err.message);
                if (err.message.includes("Room does not exist") || err.message.includes("Cannot join")) {
                    throw err;
                }
                // Continue if it's just a RPC error, let the transaction try
            }

            // Step B1.5 (G-025): $GO balance + allowance before the join tx
            await ensureGoBalance(amountInWei);
            await ensureAllowance(amountInWei);

            // Step B2: Join Room on Blockchain ($GO stake via transferFrom)
            console.log("Joining room on blockchain with $GO stake...");
            const joinTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function joinRoom(bytes32)",
                params: [roomId as `0x${string}`],
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

    // 7. Cancel Room Flow (G-012: refund UI — creator cancels a WAITING room,
    //    the contract refunds every participant in $GO)
    const handleCancelRoom = async (roomId: string) => {
        if (!account) return showToast("Please connect your wallet first", "error");

        setIsProcessing(true);
        try {
            console.log("Cancelling room on-chain...", roomId);
            const cancelTx = prepareContractCall({
                contract: ludoVaultContract,
                method: "function cancelRoom(bytes32)",
                params: [roomId as `0x${string}`],
            });
            const txResult = await sendTx(cancelTx);
            await confirmTx(txResult.transactionHash);

            // Backend cleanup is best-effort — the room dies on-chain either way.
            try {
                await syncWithBackend('rooms/cancel', { roomId, txHash: txResult.transactionHash });
            } catch (err) {
                console.warn("Backend cancel sync failed (lobby entry will expire on its own):", err);
            }

            refreshGoBalance();
            showToast(`Room cancelled — stakes refunded in $${STAKE_CURRENCY_SYMBOL}.`, "success");
            return true;
        } catch (error) {
            console.error("Cancel Room Failed:", error);
            showToast(`Failed to cancel room${errorDetail(error)}`, "error");
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // 8. Faucet Flow (G-021: free testnet $GO from the pre-funded on-chain
    //    reservoir — transfers, never mints; contract enforces a cooldown)
    const handleFaucetClaim = async () => {
        if (!account) { showToast("Please connect your wallet first", "error"); return false; }

        setIsProcessing(true);
        try {
            const cooldown = await readContract({
                contract: goTokenContract,
                method: "function faucetCooldownRemaining(address) view returns (uint256)",
                params: [account.address],
            }) as bigint;
            if (cooldown > 0n) {
                const mins = Math.ceil(Number(cooldown) / 60);
                showToast(`Faucet cooldown active — try again in ~${mins} min.`, "info");
                return false;
            }

            const faucetTx = prepareContractCall({
                contract: goTokenContract,
                method: "function faucet()",
                params: [],
            });
            const txResult = await sendTx(faucetTx);
            await confirmTx(txResult.transactionHash);

            await refreshGoBalance();
            showToast(`💧 Testnet $${STAKE_CURRENCY_SYMBOL} received — you're ready to stake!`, "success");
            return true;
        } catch (error) {
            console.error("Faucet Claim Failed:", error);
            showToast(`Faucet claim failed${errorDetail(error)}`, "error");
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        account,
        balance,
        balanceSymbol,
        goBalance,
        goBalanceWei,
        isProcessing,
        handleCreateRoom,
        handleJoinGame,
        handleClaimPayout,
        handleCancelRoom,
        handleFaucetClaim,
        refetchBalance
    };
};
