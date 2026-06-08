'use client';

import { useState } from 'react';
import { baseSepolia } from 'wagmi/chains';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi';

const CONTRACT_ADDRESS = '0x62c00F09F8DaA6056Ad4F994BB2CF338D4e4Dc94' as `0x${string}`;

const ABI = [
  {
    name: 'createPoll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_question', type: 'string' },
      { name: '_options', type: 'string[]' },
    ],
    outputs: [],
  },
  {
    name: 'vote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_pollId', type: 'uint256' },
      { name: '_optionIndex', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'getPoll',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_pollId', type: 'uint256' }],
    outputs: [
      { name: 'question', type: 'string' },
      { name: 'options', type: 'string[]' },
      { name: 'votes', type: 'uint256[]' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    name: 'getTotalPolls',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function ConnectWallet() {
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected, address } = useAccount();
  const [showList, setShowList] = useState(false);

  if (isConnected) return (
    <button
      onClick={() => disconnect()}
      className="bg-gray-800 px-3 py-2 rounded-xl text-sm"
    >
      {address?.slice(0, 6)}...{address?.slice(-4)} ✕
    </button>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setShowList(!showList)}
        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-sm font-medium"
      >
        Connect Wallet
      </button>
      {showList && (
        <div className="absolute right-0 mt-2 bg-gray-800 rounded-xl overflow-hidden shadow-xl z-10 min-w-48">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector });
                setShowList(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm"
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const [pollId, setPollId] = useState(0);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [view, setView] = useState<'vote' | 'create'>('vote');

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: pollData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getPoll',
    args: [BigInt(pollId)],
  });

  const { data: totalPolls } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getTotalPolls',
  });

  const handleVote = (optionIndex: number) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'vote',
      args: [BigInt(pollId), BigInt(optionIndex)],
    });
  };

  const handleCreatePoll = () => {
    const filteredOptions = options.filter(o => o.trim() !== '');
    if (!question || filteredOptions.length < 2) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'createPoll',
      args: [question, filteredOptions],
    });
  };

  const totalVotes = pollData
    ? pollData[2].reduce((a, b) => a + b, BigInt(0))
    : BigInt(0);

  const isWrongNetwork = isConnected && chain?.id !== baseSepolia.id;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-md mx-auto">

        <div className="flex justify-between items-center mb-8 pt-4">
          <h1 className="text-2xl font-bold">🗳️ Group Poll</h1>
          <ConnectWallet />
        </div>

        {isWrongNetwork && (
          <button
            onClick={() => switchChain({ chainId: baseSepolia.id })}
            className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl text-sm font-medium mb-4"
          >
            ⚠️ Wrong network — click to switch to Base Sepolia
          </button>
        )}

        {!isConnected ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">Connect your wallet to get started</p>
            <p className="text-sm">Create and vote on polls with your group</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setView('vote')}
                className={`flex-1 py-2 rounded-xl font-medium transition ${view === 'vote' ? 'bg-blue-600' : 'bg-gray-800'}`}
              >
                Vote
              </button>
              <button
                onClick={() => setView('create')}
                className={`flex-1 py-2 rounded-xl font-medium transition ${view === 'create' ? 'bg-blue-600' : 'bg-gray-800'}`}
              >
                Create Poll
              </button>
            </div>

            {view === 'vote' && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setPollId(Math.max(0, pollId - 1))}
                    className="bg-gray-800 px-3 py-1 rounded-lg"
                  >
                    ←
                  </button>
                  <span className="flex-1 text-center text-sm text-gray-400">
                    Poll {pollId + 1} of {totalPolls ? totalPolls.toString() : '?'}
                  </span>
                  <button
                    onClick={() => setPollId(pollId + 1)}
                    className="bg-gray-800 px-3 py-1 rounded-lg"
                  >
                    →
                  </button>
                </div>

                {pollData ? (
                  <div className="bg-gray-900 rounded-2xl p-5">
                    <h2 className="text-lg font-semibold mb-4">{pollData[0]}</h2>
                    <div className="space-y-3">
                      {pollData[1].map((option, i) => {
                        const voteCount = Number(pollData[2][i]);
                        const total = Number(totalVotes);
                        const percent = total > 0 ? Math.round((voteCount / total) * 100) : 0;
                        return (
                          <button
                            key={i}
                            onClick={() => handleVote(i)}
                            disabled={isPending || isConfirming}
                            className="w-full text-left bg-gray-800 hover:bg-blue-700 rounded-xl p-4 transition relative overflow-hidden"
                          >
                            <div
                              className="absolute inset-0 bg-blue-600 opacity-20 rounded-xl"
                              style={{ width: `${percent}%` }}
                            />
                            <div className="relative flex justify-between">
                              <span>{option}</span>
                              <span className="text-sm text-gray-400">
                                {voteCount} votes ({percent}%)
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                      Total votes: {totalVotes.toString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">No poll found</p>
                )}
              </div>
            )}

            {view === 'create' && (
              <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
                <h2 className="font-semibold text-lg">New Poll</h2>
                <input
                  className="w-full bg-gray-800 rounded-xl p-3 text-white placeholder-gray-500 outline-none"
                  placeholder="Your question..."
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                />
                {options.map((opt, i) => (
                  <input
                    key={i}
                    className="w-full bg-gray-800 rounded-xl p-3 text-white placeholder-gray-500 outline-none"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const updated = [...options];
                      updated[i] = e.target.value;
                      setOptions(updated);
                    }}
                  />
                ))}
                {options.length < 6 && (
                  <button
                    onClick={() => setOptions([...options, ''])}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    + Add option
                  </button>
                )}
                <button
                  onClick={handleCreatePoll}
                  disabled={isPending || isConfirming || isWrongNetwork}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 py-3 rounded-xl font-medium transition"
                >
                  {isPending ? 'Confirm in wallet...' : isConfirming ? 'Creating...' : 'Create Poll'}
                </button>
                {isSuccess && (
                  <p className="text-green-400 text-center text-sm">
                    ✅ Poll created! Switch to Vote tab.
                  </p>
                )}
              </div>
            )}

            {(isPending || isConfirming) && (
              <p className="text-center text-yellow-400 text-sm mt-4">
                {isPending ? '⏳ Waiting for wallet confirmation...' : '⛓️ Transaction confirming...'}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
