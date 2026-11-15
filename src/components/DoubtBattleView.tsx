/**
 * DoubtBattleView — AGNI Multiplayer Doubt Battle (Feature 12)
 * Create a challenge with a topic, share code, AGNI judges explanation.
 * Leaderboard stored in localStorage.
 * Founder: M. Sanjay (muralisanjayyadav@gmail.com)
 */

import React, { useState, useEffect } from 'react';
import { Swords, Trophy, Share2, Plus, CheckCircle, XCircle, Copy, Users } from 'lucide-react';
import BackButton from './BackButton';

interface BattleEntry {
  id: string;
  topic: string;
  code: string;
  createdAt: string;
  player1: string;
  player2?: string;
  answer1?: string;
  answer2?: string;
  verdict?: string;
  winner?: string;
  score1?: number;
  score2?: number;
}

interface LeaderboardEntry {
  name: string;
  wins: number;
  battles: number;
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function DoubtBattleView() {
  const [view, setView] = useState<'home' | 'create' | 'join' | 'battle' | 'result'>('home');
  const [battles, setBattles] = useState<BattleEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('agni_battles') || '[]'); } catch { return []; }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('agni_leaderboard') || '[]'); } catch { return []; }
  });
  const [activeBattle, setActiveBattle] = useState<BattleEntry | null>(null);
  const [topic, setTopic] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('user_name') || '');
  const [joinCode, setJoinCode] = useState('');
  const [myAnswer, setMyAnswer] = useState('');
  const [isJudging, setIsJudging] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('agni_battles', JSON.stringify(battles));
  }, [battles]);

  useEffect(() => {
    localStorage.setItem('agni_leaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  const createBattle = () => {
    if (!topic.trim() || !playerName.trim()) return;
    const newBattle: BattleEntry = {
      id: Date.now().toString(),
      topic: topic.trim(),
      code: generateCode(),
      createdAt: new Date().toISOString(),
      player1: playerName.trim(),
    };
    setBattles((prev) => [newBattle, ...prev]);
    setActiveBattle(newBattle);
    setView('battle');
    setTopic('');
  };

  const joinBattle = () => {
    if (!joinCode.trim() || !playerName.trim()) return;
    const found = battles.find((b) => b.code === joinCode.trim().toUpperCase() && !b.verdict);
    if (!found) { alert('Battle code not found or already completed!'); return; }
    const updated = { ...found, player2: playerName.trim() };
    setBattles((prev) => prev.map((b) => (b.id === found.id ? updated : b)));
    setActiveBattle(updated);
    setView('battle');
    setJoinCode('');
  };

  const submitAnswer = async () => {
    if (!activeBattle || !myAnswer.trim()) return;
    setIsJudging(true);

    const isPlayer1 = activeBattle.player1 === playerName;
    const updated: BattleEntry = {
      ...activeBattle,
      ...(isPlayer1 ? { answer1: myAnswer } : { answer2: myAnswer }),
    };

    // If both answers exist, judge with Groq
    const ans1 = isPlayer1 ? myAnswer : activeBattle.answer1;
    const ans2 = !isPlayer1 ? myAnswer : activeBattle.answer2;

    if (ans1 && ans2) {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `You are AGNI, judging a Doubt Battle on the topic: "${activeBattle.topic}".

Player 1 (${activeBattle.player1}) answered: "${ans1}"
Player 2 (${activeBattle.player2 || 'Player 2'}) answered: "${ans2}"

Judge both answers on accuracy, clarity, and completeness. Give each a score out of 10.
Declare a winner. Format:
Score 1: X/10
Score 2: X/10
Winner: [name or "Tie"]
Verdict: [2-3 sentence explanation]`,
          }),
        });
        const data = await res.json();
        const verdict = data.reply || data.text || 'Both players gave great answers! Well done.';

        // Parse scores
        const s1match = verdict.match(/Score 1:\s*(\d+)/i);
        const s2match = verdict.match(/Score 2:\s*(\d+)/i);
        const winnerMatch = verdict.match(/Winner:\s*(.+)/i);
        const score1 = s1match ? parseInt(s1match[1]) : 7;
        const score2 = s2match ? parseInt(s2match[1]) : 7;
        const winner = winnerMatch ? winnerMatch[1].trim() : 'Tie';

        const finalBattle: BattleEntry = {
          ...updated,
          answer1: ans1,
          answer2: ans2,
          verdict,
          winner,
          score1,
          score2,
        };

        setBattles((prev) => prev.map((b) => (b.id === activeBattle.id ? finalBattle : b)));
        setActiveBattle(finalBattle);

        // Update leaderboard
        if (winner !== 'Tie') {
          setLeaderboard((prev) => {
            const updated = [...prev];
            [activeBattle.player1, activeBattle.player2 || ''].filter(Boolean).forEach((p) => {
              const idx = updated.findIndex((e) => e.name === p);
              if (idx >= 0) {
                updated[idx].battles++;
                if (p === winner) updated[idx].wins++;
              } else {
                updated.push({ name: p, wins: p === winner ? 1 : 0, battles: 1 });
              }
            });
            return updated.sort((a, b) => b.wins - a.wins);
          });
        }

        setView('result');
      } catch {
        alert('Could not get verdict. Check your internet connection.');
      }
    } else {
      setBattles((prev) => prev.map((b) => (b.id === activeBattle.id ? updated : b)));
      setActiveBattle(updated);
    }

    setIsJudging(false);
    setMyAnswer('');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <BackButton />
        <Swords className="h-6 w-6 text-[#FF6B00]" />
        <div>
          <h1 className="text-lg font-bold text-[#FF6B00]">Doubt Battle ⚔️</h1>
          <p className="text-xs text-neutral-400">Challenge friends — AGNI judges the winner</p>
        </div>
      </div>

      <div className="p-4 max-w-xl mx-auto w-full space-y-4 pb-24">
        {view === 'home' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setView('create')} className="bg-[#FF6B00] hover:bg-orange-600 rounded-2xl p-5 flex flex-col items-center gap-2 font-semibold transition-all">
                <Plus className="h-7 w-7" />
                <span>Create Battle</span>
              </button>
              <button onClick={() => setView('join')} className="bg-white/10 hover:bg-white/20 rounded-2xl p-5 flex flex-col items-center gap-2 font-semibold border border-white/10 transition-all">
                <Users className="h-7 w-7" />
                <span>Join Battle</span>
              </button>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <h3 className="font-bold text-white">Leaderboard</h3>
                </div>
                {leaderboard.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm font-bold text-[#FF6B00] w-5">#{i + 1}</span>
                    <span className="flex-1 text-sm">{e.name}</span>
                    <span className="text-xs text-neutral-400">{e.wins}W / {e.battles}B</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent battles */}
            {battles.filter(b => b.verdict).slice(0, 3).map((b) => (
              <div key={b.id} className="bg-white/5 rounded-xl p-3 border border-white/10 text-sm">
                <div className="font-semibold text-[#FF6B00] truncate">{b.topic}</div>
                <div className="text-xs text-neutral-400">{b.player1} vs {b.player2 || '?'} · Winner: <span className="text-green-400">{b.winner}</span></div>
              </div>
            ))}
          </>
        )}

        {view === 'create' && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
            <h3 className="font-bold text-[#FF6B00] text-lg">Create a Battle</h3>
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]" />
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Battle topic (e.g. Explain Photosynthesis)" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]" />
            <div className="flex gap-3">
              <button onClick={createBattle} className="flex-1 bg-[#FF6B00] hover:bg-orange-600 rounded-xl py-3 font-semibold">Start Battle</button>
              <button onClick={() => setView('home')} className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        )}

        {view === 'join' && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
            <h3 className="font-bold text-[#FF6B00] text-lg">Join a Battle</h3>
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00]" />
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Battle Code (e.g. AB12CD)" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#FF6B00]" />
            <div className="flex gap-3">
              <button onClick={joinBattle} className="flex-1 bg-[#FF6B00] hover:bg-orange-600 rounded-xl py-3 font-semibold">Join Battle</button>
              <button onClick={() => setView('home')} className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm">Cancel</button>
            </div>
          </div>
        )}

        {view === 'battle' && activeBattle && (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-[#FF6B00]/30">
              <div className="text-xs text-neutral-400 mb-1">Battle Topic</div>
              <div className="font-bold text-white text-lg">{activeBattle.topic}</div>
              <div className="flex items-center gap-3 mt-3">
                <div className="bg-white/10 rounded-xl px-3 py-2 font-mono text-[#FF6B00] font-bold text-lg tracking-widest">{activeBattle.code}</div>
                <button onClick={() => copyCode(activeBattle.code)} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white">
                  <Copy className="h-3 w-3" />
                  {copied ? 'Copied!' : 'Share code'}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">Share this code with your opponent to join</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
              <label className="text-sm font-semibold text-[#FF6B00]">Your Explanation ({playerName}):</label>
              <textarea
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                placeholder={`Explain "${activeBattle.topic}" in your own words…`}
                rows={5}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#FF6B00]"
              />
              <button
                onClick={submitAnswer}
                disabled={isJudging || !myAnswer.trim()}
                className="w-full bg-[#FF6B00] hover:bg-orange-600 rounded-xl py-3 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isJudging ? '⚖️ AGNI is judging…' : 'Submit Answer'}
              </button>
            </div>
          </div>
        )}

        {view === 'result' && activeBattle?.verdict && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#FF6B00]">Winner: {activeBattle.winner}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: activeBattle.player1, score: activeBattle.score1, answer: activeBattle.answer1 },
                { name: activeBattle.player2 || 'Player 2', score: activeBattle.score2, answer: activeBattle.answer2 },
              ].map((p, i) => (
                <div key={i} className={`bg-white/5 rounded-xl p-3 border ${activeBattle.winner === p.name ? 'border-yellow-500' : 'border-white/10'}`}>
                  <div className="font-bold text-sm">{p.name}</div>
                  <div className="text-2xl font-bold text-[#FF6B00]">{p.score}/10</div>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-3">{p.answer}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-sm text-neutral-300 leading-relaxed border border-white/10">
              <div className="font-semibold text-[#FF6B00] mb-2">⚖️ AGNI's Verdict:</div>
              {activeBattle.verdict}
            </div>
            <button onClick={() => { setActiveBattle(null); setView('home'); }} className="w-full bg-[#FF6B00] hover:bg-orange-600 rounded-xl py-3 font-semibold">New Battle</button>
          </div>
        )}
      </div>
    </div>
  );
}
