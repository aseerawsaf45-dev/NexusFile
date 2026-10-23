'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Sparkles,
  FolderGit2,
  Code2,
  Cpu,
  Disc,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
  SlidersHorizontal,
  Folder,
  Layers,
  ChevronRight,
  Share2,
  Compass,
  Film,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

interface VideoScene {
  id: number;
  title: string;
  subtitle: string;
  narration: string;
  durationSeconds: number;
  badge: string;
  badgeColor: string;
}

const SCENES: VideoScene[] = [
  {
    id: 1,
    title: 'The Storage & Workspace Chaos',
    subtitle: 'Downloads, Desktop, and project drives cluttering with untracked data',
    narration:
      'Every engineer and creator knows the pain: gigabytes of scattered Git repos, loose Python scripts, multi-gigabyte AI model weights, and unorganized installers choking your SSD.',
    durationSeconds: 10,
    badge: 'Problem',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  },
  {
    id: 2,
    title: 'Multi-Signal Classification Engine',
    subtitle: 'Magic bytes, codebase root markers, and smart heuristics',
    narration:
      'NexusFile activates deep multi-signal probing. Beyond file extensions, it inspects raw magic byte signatures, GGUF headers, and directory markers like package.json and Cargo.toml.',
    durationSeconds: 10,
    badge: 'Core Engine',
    badgeColor: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
  },
  {
    id: 3,
    title: 'Specialized SaaS Category Streams',
    subtitle: 'Dedicated channels for Codebases, Codes, AI Models & Torrents',
    narration:
      'Files are automatically routed into dedicated high-efficiency channels: Codebases for full repos, Codes for multi-language scripts, AI Models for Safetensors, and Disk Images for bootable ISOs.',
    durationSeconds: 10,
    badge: 'Category Channels',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  {
    id: 4,
    title: 'Hierarchical Storage TreeMap',
    subtitle: 'Live NTFS drive probing & Top 50 largest files discovery',
    narration:
      'Direct Windows Win32 API inspection visualizes your drive consumption down to the byte. Color-coded treemaps pinpoint bloated directories and files larger than 1GB instantly.',
    durationSeconds: 10,
    badge: 'Storage Studio',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 5,
    title: 'Zero Data Loss Guarantee & 1-Click Undo',
    subtitle: 'Collision policies, safe quarantine, and SHA-256 audit logs',
    narration:
      'Safety is paramount. NexusFile enforces strict collision policies, protects Windows operating system cores, and provides instant 1-click reversible undo for every file movement.',
    durationSeconds: 10,
    badge: 'Safety First',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  {
    id: 6,
    title: 'Set Once. Automate Forever.',
    subtitle: 'Local-first, high-concurrency desktop studio for Windows 10 & 11',
    narration:
      'Keep your drives pristine, lightning fast, and organized automatically. NexusFile is engineered with a high-performance native engine designed for modern developers.',
    durationSeconds: 10,
    badge: 'SaaS Platform',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
];

export default function SaasCategoryVideoPage() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [sceneProgress, setSceneProgress] = useState(0); // 0 to 100% of current scene
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // Simulation test input
  const [simInput, setSimInput] = useState('flux1-dev.safetensors');
  const [simResult, setSimResult] = useState<{
    category: string;
    target: string;
    color: string;
    icon: string;
  }>({
    category: 'AI Models',
    target: 'AI Models/Safetensors/flux1-dev.safetensors',
    color: '#a855f7',
    icon: 'Cpu',
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Sound chimes
  const playChime = (freq: number = 520) => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  };

  // Main playback timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 50;
    const scene = SCENES[currentSceneIdx];
    const step = (100 / (scene.durationSeconds * (1000 / intervalMs))) * playbackSpeed;

    const timer = setInterval(() => {
      setSceneProgress((prev) => {
        if (prev + step >= 100) {
          // Advance to next scene
          if (currentSceneIdx + 1 < SCENES.length) {
            setCurrentSceneIdx((curr) => curr + 1);
            playChime(440 + (currentSceneIdx + 1) * 70);
            return 0;
          } else {
            // Loop back to start
            setCurrentSceneIdx(0);
            playChime(660);
            return 0;
          }
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentSceneIdx, playbackSpeed, isMuted]);

  // Canvas visualizer loop (paints dynamic frames for recording & preview)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;
      const activeScene = SCENES[currentSceneIdx];

      // Background Gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#0d1527');
      grad.addColorStop(1, '#080a10');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Ambient Cyber Grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Neon Top Bar
      const topBarGrad = ctx.createLinearGradient(0, 0, w, 0);
      topBarGrad.addColorStop(0, '#f97316');
      topBarGrad.addColorStop(0.33, '#06b6d4');
      topBarGrad.addColorStop(0.66, '#a855f7');
      topBarGrad.addColorStop(1, '#10b981');
      ctx.fillStyle = topBarGrad;
      ctx.fillRect(0, 0, w, 4);

      // Scene-specific visual rendering
      if (activeScene.id === 1) {
        // SCENE 1: File Chaos
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText('⚡ NexusFile — SaaS Category Demo', 40, 50);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Scene 1: Overloaded Downloads & Storage Chaos', 40, 75);

        // Draw chaotic scattered file boxes
        const files = [
          { name: 'pytorch_weights.safetensors (14.2 GB)', color: '#ec4899', x: 60, y: 130 },
          { name: 'my-project-repo (untracked .git)', color: '#f97316', x: 260, y: 190 },
          { name: 'backup_2026.iso (4.8 GB)', color: '#e11d48', x: 80, y: 250 },
          { name: 'agent.rs + train.py', color: '#06b6d4', x: 380, y: 120 },
          { name: 'invoice_2026_q3.pdf', color: '#3b82f6', x: 420, y: 260 },
          { name: 'ubuntu-26.04.torrent', color: '#10b981', x: 180, y: 310 },
        ];

        files.forEach((f, idx) => {
          const floatOffset = Math.sin((tick + idx * 30) * 0.05) * 6;
          ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 1.5;
          ctx.roundRect(f.x, f.y + floatOffset, 280, 48, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = f.color;
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillText('📄 ' + f.name, f.x + 14, f.y + floatOffset + 28);
        });
      } else if (activeScene.id === 2) {
        // SCENE 2: Multi-Signal Engine
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText('🧠 Multi-Signal Classification Engine', 40, 50);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Magic byte headers + Codebase probing + Smart heuristics', 40, 75);

        // Central scanner ring
        const cx = w / 2;
        const cy = h / 2 + 20;
        const radius = 70 + Math.sin(tick * 0.08) * 8;

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MAGIC BYTES', cx, cy - 6);
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('GGUF | PE | WASM', cx, cy + 14);
        ctx.textAlign = 'left';

        // Particle signals
        const signals = ['package.json', 'Cargo.toml', '.safetensors', '.iso', 'id_rsa', '.torrent'];
        signals.forEach((sig, i) => {
          const angle = (i * (Math.PI * 2)) / signals.length + tick * 0.02;
          const sx = cx + Math.cos(angle) * 160;
          const sy = cy + Math.sin(angle) * 120;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1;
          ctx.roundRect(sx - 55, sy - 18, 110, 36, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#f1f5f9';
          ctx.font = '11px monospace';
          ctx.fillText(sig, sx - 42, sy + 4);
        });
      } else if (activeScene.id === 3) {
        // SCENE 3: Dedicated Category Streams
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText('🗂️ Specialized High-Efficiency Categories', 40, 50);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Real-time sorting into dedicated workspace channels', 40, 75);

        const channels = [
          { name: 'Codebases & Repos', count: '12 Projects', color: '#f97316' },
          { name: 'Source Code & Scripts', count: '148 Files', color: '#06b6d4' },
          { name: 'AI & Machine Learning', count: '6 Weights (28GB)', color: '#a855f7' },
          { name: 'Disk Images & VMs', count: '3 ISOs (11GB)', color: '#e11d48' },
          { name: 'Security & Keys', count: '8 Certs & Keys', color: '#10b981' },
          { name: 'Torrent Archives', count: '5 Active Pkgs', color: '#059669' },
        ];

        channels.forEach((ch, idx) => {
          const row = Math.floor(idx / 3);
          const col = idx % 3;
          const bx = 40 + col * 225;
          const by = 120 + row * 110;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = ch.color;
          ctx.lineWidth = 2;
          ctx.roundRect(bx, by, 210, 85, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = ch.color;
          ctx.font = 'bold 13px Inter, sans-serif';
          ctx.fillText(ch.name, bx + 14, by + 30);

          ctx.fillStyle = '#e2e8f0';
          ctx.font = '12px Inter, sans-serif';
          ctx.fillText(ch.count, bx + 14, by + 56);
        });
      } else if (activeScene.id === 4) {
        // SCENE 4: Storage Analyzer
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText('📊 Deep Storage Analyzer & Interactive TreeMap', 40, 50);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Direct Windows Win32 API live logical drive probing', 40, 75);

        // Visual treemap blocks
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(40, 110, 240, 140);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText('C:\\Projects (142 GB)', 52, 136);

        ctx.fillStyle = '#a855f7';
        ctx.fillRect(290, 110, 200, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText('AI Models (46 GB)', 302, 134);

        ctx.fillStyle = '#f97316';
        ctx.fillRect(290, 200, 200, 50);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText('Codebases (18 GB)', 302, 228);

        ctx.fillStyle = '#e11d48';
        ctx.fillRect(500, 110, 180, 140);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText('Disk Images (32 GB)', 512, 136);

        // Meter bar
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.roundRect(40, 270, 640, 50, 8);
        ctx.fill();

        ctx.fillStyle = '#10b981';
        ctx.fillRect(50, 285, 420, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText('Drive C: 238 GB Used / 512 GB Total (46% Free Space)', 55, 300);
      } else if (activeScene.id === 5) {
        // SCENE 5: Zero Data Loss & 1-Click Undo
        ctx.fillStyle = '#06b6d4';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.fillText('🛡️ Zero Data Loss Guarantee & 1-Click Undo', 40, 50);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText('Reversible audit log, collision handling & quarantine safeguards', 40, 75);

        // Safeguard pillars
        const safeguards = [
          { title: 'Smart Collision Policy', desc: 'Keep Both: file (1).pdf', color: '#10b981' },
          { title: 'Local Quarantine', desc: 'Pre-purge recoverable staging', color: '#3b82f6' },
          { title: '1-Click Undo Restore', desc: 'Reverses file moves by hash', color: '#f59e0b' },
        ];

        safeguards.forEach((sg, idx) => {
          const bx = 40 + idx * 225;
          const by = 130;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = sg.color;
          ctx.lineWidth = 2;
          ctx.roundRect(bx, by, 210, 140, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = sg.color;
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.fillText('✓ ' + sg.title, bx + 14, by + 40);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px Inter, sans-serif';
          ctx.fillText(sg.desc, bx + 14, by + 75);
          ctx.fillText('Zero risk of overwrite', bx + 14, by + 98);
        });
      } else if (activeScene.id === 6) {
        // SCENE 6: SaaS CTA
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Inter, sans-serif';
        ctx.fillText('⚡ Keep Your Drives Pristine Automatically', 40, 60);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '16px Inter, sans-serif';
        ctx.fillText('NexusFile — High-Performance File Management Studio', 40, 95);

        ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.roundRect(40, 130, 640, 140, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.fillText('Ready to organize your entire PC in milliseconds?', 70, 175);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px Inter, sans-serif';
        ctx.fillText('• 100% Local-first & Private    • Windows 10 & 11    • High-concurrency Rust Core', 70, 215);

        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText('github.com/aseerawsaf45-dev/NexusFile', 70, 245);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentSceneIdx]);

  // Handle Export / Download WebM Video
  const handleExportVideo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsRecording(true);
      setRecordProgress(0);
      recordedChunksRef.current = [];

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NexusFile-SaaS-Category-Demo.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        setRecordProgress(100);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      // Record for full 12-second commercial duration
      let p = 0;
      const recInterval = setInterval(() => {
        p += 8.3;
        setRecordProgress(Math.min(100, Math.round(p)));
        if (p >= 100) {
          clearInterval(recInterval);
          recorder.stop();
        }
      }, 1000);
    } catch (err: any) {
      alert('Video export error: ' + (err?.message || 'Unsupported browser codec'));
      setIsRecording(false);
    }
  };

  // Run live classification simulation
  const handleSimulate = (name: string) => {
    setSimInput(name);
    const lower = name.toLowerCase();
    if (lower.endsWith('.safetensors') || lower.endsWith('.gguf') || lower.endsWith('.onnx') || lower.endsWith('.pt')) {
      setSimResult({
        category: 'AI Models',
        target: `AI Models/${name}`,
        color: '#a855f7',
        icon: 'Cpu',
      });
    } else if (lower.endsWith('.whl') || lower.endsWith('.crate') || lower.endsWith('.gitbundle') || lower.includes('project') || lower.includes('repo')) {
      setSimResult({
        category: 'Codebases',
        target: `Codebases/${name}`,
        color: '#f97316',
        icon: 'FolderGit2',
      });
    } else if (lower.endsWith('.rs') || lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.py') || lower.endsWith('.sql')) {
      setSimResult({
        category: 'Codes',
        target: `Codes/${name}`,
        color: '#06b6d4',
        icon: 'Code2',
      });
    } else if (lower.endsWith('.iso') || lower.endsWith('.vmdk') || lower.endsWith('.img')) {
      setSimResult({
        category: 'Disk Images',
        target: `Disk Images/${name}`,
        color: '#e11d48',
        icon: 'Disc',
      });
    } else if (lower.endsWith('.pem') || lower.endsWith('.key') || lower.endsWith('.crt') || lower === 'id_rsa') {
      setSimResult({
        category: 'Security',
        target: `Security/${name}`,
        color: '#10b981',
        icon: 'ShieldCheck',
      });
    } else {
      setSimResult({
        category: 'Documents',
        target: `Documents/${name}`,
        color: '#3b82f6',
        icon: 'Folder',
      });
    }
  };

  const activeScene = SCENES[currentSceneIdx];

  return (
    <AppShell
      title="SaaS Category Video Showcase"
      subtitle="Interactive motion reel showcasing NexusFile's next-generation classification and storage automation"
    >
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* VIDEO PLAYER CONTAINER */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xl space-y-0">
          {/* Top Video Header */}
          <div className="p-4 px-6 border-b border-border bg-secondary/40 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <Film className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>NexusFile Commercial Video Reel</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${activeScene.badgeColor}`}>
                    {activeScene.badge}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">{activeScene.title}</p>
              </div>
            </div>

            {/* Quick Export Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportVideo}
                disabled={isRecording}
                className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                <Download className={`w-3.5 h-3.5 ${isRecording ? 'animate-bounce' : ''}`} />
                <span>{isRecording ? `Recording (${recordProgress}%)` : 'Export Video (.webm)'}</span>
              </button>
            </div>
          </div>

          {/* Canvas Screen */}
          <div className="relative bg-black flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              width={720}
              height={380}
              className="w-full max-w-[720px] h-auto aspect-[16/9] shadow-inner block"
            />

            {/* Live Narration Subtitle Ribbon */}
            <div className="absolute bottom-4 left-6 right-6 p-3 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs text-slate-200 shadow-lg flex items-center gap-3 animate-in fade-in duration-200">
              <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping flex-shrink-0" />
              <p className="flex-1 italic tracking-wide">{activeScene.narration}</p>
            </div>
          </div>

          {/* Timeline & Player Controls Bar */}
          <div className="p-4 px-6 bg-card border-t border-border space-y-3">
            {/* Progress Bar */}
            <div className="relative w-full h-1.5 rounded-full bg-secondary overflow-hidden cursor-pointer">
              <div
                className="h-full bg-gradient-to-r from-brand-500 via-purple-500 to-emerald-400 transition-all duration-75"
                style={{
                  width: `${((currentSceneIdx + sceneProgress / 100) / SCENES.length) * 100}%`,
                }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-brand-500" />}
                </button>

                <button
                  onClick={() => {
                    setCurrentSceneIdx(0);
                    setSceneProgress(0);
                  }}
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title={isMuted ? 'Unmute Chimes' : 'Mute Chimes'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="font-mono text-[11px] text-foreground">
                  Scene {currentSceneIdx + 1} of {SCENES.length}
                </span>
              </div>

              {/* Scene Jump Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-md">
                {SCENES.map((sc, i) => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setCurrentSceneIdx(i);
                      setSceneProgress(0);
                      playChime(400 + i * 60);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                      currentSceneIdx === i
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sc.badge}
                  </button>
                ))}
              </div>

              {/* Speed toggle */}
              <div className="flex items-center gap-1">
                {[1, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      playbackSpeed === spd
                        ? 'bg-secondary font-bold text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE CATEGORY SANDBOX */}
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span>Live Category Classifier Sandbox</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Test any file format or codebase folder below to watch NexusFile route it instantly
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                'flux1-dev.safetensors',
                'qwen2.5-7b.gguf',
                'my-nextjs-project',
                'main.rs',
                'archlinux.iso',
                'id_ed25519',
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => handleSimulate(sample)}
                  className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-foreground">Test File or Directory Name</label>
              <input
                type="text"
                value={simInput}
                onChange={(e) => handleSimulate(e.target.value)}
                placeholder="Type filename (e.g. weights.safetensors, agent.py, repo/)..."
                className="w-full px-4 py-2.5 bg-secondary/40 border border-border rounded-xl font-mono text-xs text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="p-4 rounded-xl border border-border bg-secondary/20 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Detected Category
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: simResult.color }}
                  >
                    {simResult.category}
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-2 truncate">
                Target: <span className="text-foreground">{simResult.target}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SAAS VALUE PROPOSITION GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-border bg-card space-y-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-foreground">Codebase Auto-Probing</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Never lose track of cloned repos or language packages. NexusFile automatically detects project markers and groups them into clean workspace hubs.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card space-y-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-foreground">AI Weights & Tensor Vault</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Safetensors, GGUF, and ONNX weights consume tens of gigabytes. NexusFile segregates and monitors AI checkpoints safely without download disruption.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card space-y-2.5 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-foreground">Zero Data-Loss Reversible Undo</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every automated file operation is recorded with SHA-256 hashes in SQLite. Restore any moved or grouped file back to its exact origin in one click.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
