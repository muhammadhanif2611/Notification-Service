"use client";

import { useState } from "react";
import { Activity, Pause, Play, Trash2, Cpu, ExternalLink } from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";

const BULL_BOARD_URL = process.env.NEXT_PUBLIC_BULL_BOARD_URL || "http://localhost:3001/admin/queues";

/**
 * Queue Telemetry Page — Monitoring & manajemen queue Redis.
 * DESIGN.md 6B.3: Visualisasi real-time queue, TPS, worker thread, DLQ purge, pause engine.
 */

const MOCK_QUEUES = [
  { name: "whatsapp-priority-queue", waiting: 234, active: 5, completed: 18420, failed: 12, delayed: 3, paused: false },
  { name: "email-transactional-queue", waiting: 89, active: 10, completed: 42100, failed: 5, delayed: 0, paused: false },
  { name: "sms-otp-queue", waiting: 15, active: 2, completed: 3200, failed: 1, delayed: 0, paused: false },
];

const MOCK_WORKERS = [
  { id: "worker-wa-1", queue: "whatsapp", status: "active", jobs: 1204, uptime: "4h 32m" },
  { id: "worker-wa-2", queue: "whatsapp", status: "active", jobs: 1189, uptime: "4h 32m" },
  { id: "worker-email-1", queue: "email", status: "active", jobs: 3502, uptime: "4h 32m" },
  { id: "worker-email-2", queue: "email", status: "active", jobs: 3411, uptime: "4h 32m" },
  { id: "worker-email-3", queue: "email", status: "idle", jobs: 0, uptime: "4h 32m" },
  { id: "worker-sms-1", queue: "sms", status: "active", jobs: 892, uptime: "4h 32m" },
];

function QueueCard({ queue }) {
  const total = queue.waiting + queue.active + queue.completed + queue.failed;
  const successRate = total > 0 ? ((queue.completed / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium font-mono text-[var(--text-primary)]">{queue.name}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Success rate: <span className="font-mono text-emerald-600 dark:text-emerald-400">{successRate}%</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Pause/Resume">
            {queue.paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-muted)] hover:text-red-600 transition-colors" title="Purge DLQ">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Queue stats grid */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Waiting", value: queue.waiting, color: "text-blue-600 dark:text-blue-400" },
          { label: "Active", value: queue.active, color: "text-amber-600 dark:text-amber-400" },
          { label: "Completed", value: queue.completed.toLocaleString(), color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Failed", value: queue.failed, color: "text-red-600 dark:text-red-400" },
          { label: "Delayed", value: queue.delayed, color: "text-[var(--text-muted)]" },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <p className={`text-lg font-semibold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex overflow-hidden">
        <div className="bg-emerald-500 h-full" style={{ width: `${(queue.completed / total) * 100}%` }} />
        <div className="bg-amber-500 h-full" style={{ width: `${(queue.active / total) * 100}%` }} />
        <div className="bg-blue-500 h-full" style={{ width: `${(queue.waiting / total) * 100}%` }} />
        <div className="bg-red-500 h-full" style={{ width: `${(queue.failed / total) * 100}%` }} />
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Queue Telemetry</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Visualisasi real-time antrean Redis dan kesehatan worker.
          </p>
        </div>
        <a
          href={BULL_BOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          <ExternalLink size={14} /> Buka Bull Board
        </a>
      </div>

      {/* TPS Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity size={16} />}
          label="Messages / Second"
          value="284"
          trend="+12%"
          trendDirection="up"
          subtitle="Real-time TPS"
        />
        <MetricCard
          icon={<Cpu size={16} />}
          label="Active Workers"
          value="5 / 6"
          subtitle="1 idle"
        />
        <MetricCard
          label="Dead Letter Queue"
          value="0"
          subtitle="Semua sudah diproses"
          trend="Clean"
          trendDirection="up"
        />
        <MetricCard
          label="Avg Processing Time"
          value="180ms"
          trend="-22ms"
          trendDirection="up"
          subtitle="Per job rata-rata"
        />
      </div>

      {/* Queue Cards */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Queue Status</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {MOCK_QUEUES.map((q) => (
            <QueueCard key={q.name} queue={q} />
          ))}
        </div>
      </div>

      {/* Worker Thread Table */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--neutral-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Worker Threads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-border)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Worker ID</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Queue</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Jobs Processed</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Uptime</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_WORKERS.map((w) => (
                <tr key={w.id} className="border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-primary)]">{w.id}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{w.queue}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs ${w.status === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${w.status === "active" ? "bg-emerald-500" : "bg-zinc-400"}`} />
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-primary)]">{w.jobs.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">{w.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
