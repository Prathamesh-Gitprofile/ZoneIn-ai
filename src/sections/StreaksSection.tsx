import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserActivities } from '@/lib/firebase';
import { Flame, Target, Play, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import type { Activity } from '@/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const APP_START = new Date('2026-03-19T00:00:00');
const CELL = 20;
const GAP = 3;

function getCellBg(count: number, isFuture: boolean, isPad: boolean, isBeforeStart: boolean): string {
  if (isPad || isBeforeStart) return 'transparent';
  if (isFuture) return '#111113';
  if (count === 0) return '#1e1e22';
  if (count === 1) return 'rgba(255,45,141,0.28)';
  if (count === 2) return 'rgba(255,45,141,0.5)';
  if (count === 3) return 'rgba(255,45,141,0.72)';
  return '#FF2D8D';
}

function MonthCard({ year, month, activityMap, today }: {
  year: number; month: number;
  activityMap: Map<string, number>; today: Date;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  // all cells: padding + real days
  const cells: { day: number | null; key: string; count: number; isFuture: boolean; isToday: boolean; isBeforeStart: boolean }[] = [];

  // leading pads
  for (let p = 0; p < firstDow; p++) {
    cells.push({ day: null, key: '', count: 0, isFuture: false, isToday: false, isBeforeStart: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isBeforeStart = date < APP_START;
    const isFuture = date > today;
    const isToday = date.getTime() === today.getTime();
    cells.push({ day: d, key, count: activityMap.get(key) ?? 0, isFuture, isToday, isBeforeStart });
  }

  // trailing pads to complete last row
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, key: '', count: 0, isFuture: false, isToday: false, isBeforeStart: false });
  }

  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const cardWidth = 7 * CELL + 6 * GAP + 24;

  return (
    <div style={{
      background: '#0d0d10',
      borderRadius: '14px',
      padding: '14px',
      width: `${cardWidth}px`,
      flexShrink: 0,
    }}>
      {/* Month name */}
      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#F4F4F5' }}>{MONTH_NAMES[month]} </span>
        <span style={{ fontSize: '12px', color: '#555' }}>{year}</span>
      </div>

      {/* Day labels row */}
      <div style={{ display: 'flex', gap: `${GAP}px`, marginBottom: `${GAP}px` }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{
            width: `${CELL}px`, height: '14px',
            fontSize: '10px', color: '#444', textAlign: 'center', lineHeight: '14px',
          }}>{d}</div>
        ))}
      </div>

      {/* Week rows */}
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: `${GAP}px`, marginBottom: ri < rows.length - 1 ? `${GAP}px` : 0 }}>
          {row.map((cell, ci) => (
            <div
              key={ci}
              title={cell.key && !cell.isFuture && !cell.isBeforeStart && cell.day
                ? `${cell.key}: ${cell.count > 0 ? `${cell.count} video${cell.count !== 1 ? 's' : ''}` : 'no activity'}`
                : ''}
              style={{
                width: `${CELL}px`,
                height: `${CELL}px`,
                borderRadius: '4px',
                background: getCellBg(cell.count, cell.isFuture, cell.day === null, cell.isBeforeStart),
                border: cell.isToday
                  ? '2px solid #FF2D8D'
                  : cell.day && !cell.isFuture && !cell.isBeforeStart
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StreaksSection() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    currentStreak: 0, longestStreak: 0,
    videosToday: 0, minutesToday: 0,
    totalVideos: 0, totalDays: 0,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getUserActivities(user.uid, 365);
        setActivities(data);
        calcStats(data);
      } catch { toast.error('Failed to load activity data'); }
      finally { setIsLoading(false); }
    };
    load();
  }, [user]);

  const calcStats = (acts: Activity[]) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const desc = [...acts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const todayAct = desc.find(a => { const d = new Date(a.date); d.setHours(0,0,0,0); return d.getTime() === today.getTime(); });

    let cur = 0, check = new Date(today);
    if (!todayAct) check.setDate(check.getDate() - 1);
    for (const a of desc) {
      const d = new Date(a.date); d.setHours(0,0,0,0);
      if (Math.floor((check.getTime() - d.getTime()) / 86400000) === cur) { cur++; check.setDate(check.getDate()-1); } else break;
    }

    let longest = 0, temp = 0; let last: Date|null = null;
    for (const a of [...acts].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())) {
      const d = new Date(a.date); d.setHours(0,0,0,0);
      if (last) { const diff = Math.floor((d.getTime()-last.getTime())/86400000); if(diff===1)temp++; else if(diff>1){longest=Math.max(longest,temp);temp=1;} } else temp=1;
      last=d;
    }

    setStats({
      currentStreak: cur,
      longestStreak: Math.max(longest, temp, cur),
      videosToday: todayAct?.videosWatched || 0,
      minutesToday: todayAct?.minutesWatched || 0,
      totalVideos: acts.reduce((s,a)=>s+a.videosWatched,0),
      totalDays: acts.filter(a=>a.videosWatched>0).length,
    });
  };

  const msg = () => {
    if (stats.currentStreak === 0) return 'Start your streak today!';
    if (stats.currentStreak === 1) return 'Great start! Keep it going!';
    if (stats.currentStreak < 7) return "You're building momentum!";
    if (stats.currentStreak < 30) return 'Impressive consistency!';
    return "You're unstoppable! 🔥";
  };

  if (isLoading) return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#A7A7AD', fontSize: '18px' }}>Loading streaks...</span>
    </section>
  );

  const actMap = new Map<string, number>();
  activities.forEach(a => {
    const d = new Date(a.date);
    // Use local date not UTC to avoid timezone shift
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    actMap.set(key, a.videosWatched);
  });

  const today = new Date(); today.setHours(0,0,0,0);

  const months = [
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
    { year: 2026, month: 4 },
    { year: 2026, month: 5 },
    { year: 2026, month: 6 },
    { year: 2026, month: 7 },
  ];

  return (
    <section style={{ minHeight: '100vh', paddingTop: '96px', paddingBottom: '64px', paddingLeft: '32px', paddingRight: '32px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '36px', fontWeight: 600, color: '#F4F4F5', margin: 0 }}>Streaks</h2>
            <p style={{ color: '#A7A7AD', marginTop: '6px', fontSize: '14px' }}>{msg()}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#121214', borderRadius: '16px', padding: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,45,141,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={24} color="#FF2D8D" />
            </div>
            <div>
              <p style={{ fontSize: '30px', fontWeight: 700, color: '#F4F4F5', margin: 0 }}>{stats.currentStreak}</p>
              <p style={{ fontSize: '11px', color: '#A7A7AD', margin: 0 }}>Current Streak</p>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div style={{ background: '#121214', borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
          {/* Row 1: Mar Apr May */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {months.slice(0, 3).map(({ year, month }) => (
              <MonthCard key={`${year}-${month}`} year={year} month={month} activityMap={actMap} today={today} />
            ))}
          </div>
          {/* Row 2: Jun Jul Aug */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {months.slice(3).map(({ year, month }) => (
              <MonthCard key={`${year}-${month}`} year={year} month={month} activityMap={actMap} today={today} />
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e1e22' }}>
            <span style={{ fontSize: '12px', color: '#555' }}>{stats.totalVideos} videos · {stats.totalDays} active days</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Less</span>
              {[0, 1, 2, 3, 4].map(n => (
                <div key={n} style={{ width: '14px', height: '14px', borderRadius: '3px', background: getCellBg(n, false, false, false), border: '1px solid rgba(255,255,255,0.04)' }} />
              ))}
              <span style={{ fontSize: '12px', color: '#555' }}>More</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { icon: <Target size={20} color="#fbbf24" />, bg: 'rgba(251,191,36,0.1)', label: 'Longest Streak', value: stats.longestStreak, sub: 'days' },
            { icon: <Play size={20} color="#22c55e" />, bg: 'rgba(34,197,94,0.1)', label: 'Videos Today', value: stats.videosToday, sub: stats.videosToday > 0 ? 'Keep it up!' : 'Start watching!' },
            { icon: <Clock size={20} color="#60a5fa" />, bg: 'rgba(96,165,250,0.1)', label: 'Minutes Today', value: stats.minutesToday, sub: `${Math.floor(stats.minutesToday/60)}h ${stats.minutesToday%60}m` },
          ].map(({ icon, bg, label, value, sub }) => (
            <div key={label} style={{ background: '#121214', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <span style={{ fontSize: '13px', color: '#A7A7AD' }}>{label}</span>
              </div>
              <p style={{ fontSize: '30px', fontWeight: 700, color: '#F4F4F5', margin: 0 }}>{value}</p>
              <p style={{ fontSize: '11px', color: '#A7A7AD', marginTop: '4px' }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div style={{ background: '#1a1a1c', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <TrendingUp size={20} color="#FF2D8D" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#F4F4F5', margin: '0 0 4px' }}>Consistency beats intensity</p>
            <p style={{ fontSize: '12px', color: '#A7A7AD', margin: 0 }}>
              Watching just one video a day is better than binge-watching once a week. Small, consistent efforts compound into significant learning over time.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}