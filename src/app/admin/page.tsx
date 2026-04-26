'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Track visit hook
function useTrackVisit(path: string) {
  useEffect(() => {
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }, [path]);
}

interface DashboardData {
  summary: {
    totalUsers: number;
    todayNewUsers: number;
    yesterdayNewUsers: number;
    totalGenerations: number;
    todayGenerations: number;
    todayFailed: number;
    yesterdayGenerations: number;
    yesterdayFailed: number;
    successRate: number;
    activeCelebrities: number;
    disabledCelebrities: number;
    totalVisits: number;
    todayVisits: number;
    onlineUsers: number;
    uniqueIPs: number;
  };
  visitStats: {
    totalVisits: number;
    todayVisits: number;
    onlineUsers: number;
    uniqueIPs: number;
    topPaths: Array<{ path: string; count: number }>;
  };
  dailyStats: Array<{
    date: string;
    generations: number;
    failed: number;
    newUsers: number;
  }>;
  hotCelebs: Array<{
    id: string;
    name: string;
    category: string;
    count: number;
    success: number;
    failed: number;
  }>;
  recentUsers: Array<{
    email: string;
    referralCode: string;
    inviteCount: number;
    createdAt: string;
  }>;
  recentGenerations: Array<{
    time: string;
    user: string;
    celeb: string;
    success: boolean;
    imageUrl: string | null;
    hasUserImage: boolean;
    hasArchivedUserImage: boolean;
    hasArchivedResultImage: boolean;
  }>;
  evolutionLogs: Array<{
    celebrityId: string;
    action: string;
    reason: string;
    timestamp: string;
  }>;
  celebrityStatus: Array<{
    id: string;
    name: string;
    category: string;
    hotness: number;
    disabled: boolean;
    failCount: number;
    hasVariants: boolean;
  }>;
}

type TabType = 'overview' | 'users' | 'generations' | 'celebrities' | 'logs';

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [viewingArchive, setViewingArchive] = useState<string | null>(null);
  const [archiveData, setArchiveData] = useState<any>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { credentials: 'include' });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!res.ok) throw new Error('加载失败');
      const json = await res.json();
      setData(json);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 自动刷新每30秒
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // 加载存档图片
  useEffect(() => {
    if (viewingArchive) {
      setArchiveLoading(true);
      fetch(`/api/admin/archive?timestamp=${encodeURIComponent(viewingArchive)}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setArchiveData(data);
          setArchiveLoading(false);
        })
        .catch(() => {
          setArchiveLoading(false);
        });
    }
  }, [viewingArchive]);

  // Track admin page visit
  useTrackVisit('/admin');

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE', credentials: 'include' });
    router.replace('/admin/login');
  };

  const handleToggleCelebrity = async (id: string, currentDisabled: boolean) => {
    const action = currentDisabled ? 'enable' : 'disable';
    try {
      const res = await fetch(`/api/admin/celebrity-status?key=${process.env.NEXT_PUBLIC_ADMIN_KEY || 'mingren-admin-2026'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celebrityId: id, action }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-violet-400 animate-pulse">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'overview', label: '总览', icon: '📊' },
    { id: 'users', label: '用户', icon: '👥' },
    { id: 'generations', label: '生成', icon: '🎨' },
    { id: 'celebrities', label: '名人', icon: '⭐' },
    { id: 'logs', label: '日志', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-violet-500/20 bg-[#0f0f1a]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              mingren.pics
            </h1>
            <span className="text-xs px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">
              管理后台
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {refreshing ? '刷新中...' : '🔄 刷新'}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-violet-500/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                title="总用户数"
                value={summary.totalUsers}
                change={summary.todayNewUsers}
                changeLabel="今日新增"
                color="violet"
              />
              <KpiCard
                title="总生成次数"
                value={summary.totalGenerations}
                change={summary.todayGenerations}
                changeLabel="今日生成"
                color="cyan"
              />
              <KpiCard
                title="今日成功率"
                value={`${summary.successRate}%`}
                change={summary.todayFailed}
                changeLabel="今日失败"
                color={summary.successRate > 80 ? 'green' : summary.successRate > 50 ? 'yellow' : 'red'}
              />
              <KpiCard
                title="在线名人"
                value={summary.activeCelebrities}
                change={summary.disabledCelebrities}
                changeLabel="已下线"
                color="violet"
              />
            </div>

            {/* 访问统计 KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                title="总访问量"
                value={summary.totalVisits}
                change={summary.todayVisits}
                changeLabel="今日访问"
                color="cyan"
              />
              <KpiCard
                title="当前在线"
                value={summary.onlineUsers}
                change={0}
                changeLabel="5分钟内活跃"
                color="green"
              />
              <KpiCard
                title="今日访问"
                value={summary.todayVisits}
                change={0}
                changeLabel="独立IP"
                color="yellow"
              />
              <KpiCard
                title="独立IP数"
                value={summary.uniqueIPs}
                change={0}
                changeLabel="总独立访客"
                color="violet"
              />
            </div>

            {/* 7-Day Chart */}
            <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
              <h3 className="text-lg font-semibold mb-4">近7天趋势</h3>
              <div className="flex items-end gap-2 h-48">
                {data.dailyStats.map((day, i) => {
                  const maxGen = Math.max(...data.dailyStats.map(d => d.generations + d.failed), 1);
                  const genHeight = (day.generations / maxGen) * 100;
                  const failHeight = (day.failed / maxGen) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col items-center gap-0.5">
                        <div
                          className="w-full bg-cyan-500/60 rounded-t"
                          style={{ height: `${genHeight}%` }}
                          title={`成功: ${day.generations}`}
                        />
                        <div
                          className="w-full bg-red-500/60 rounded-b"
                          style={{ height: `${failHeight}%` }}
                          title={`失败: ${day.failed}`}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{day.date.slice(5)}</span>
                      <span className="text-xs text-violet-400">+{day.newUsers}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan-500/60 rounded"/> 成功生成</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/60 rounded"/> 失败</span>
                <span className="flex items-center gap-1 text-violet-400">+ 新增用户</span>
              </div>
            </div>

            {/* Hot Celebrities */}
            <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
              <h3 className="text-lg font-semibold mb-4">名人热度排行 TOP10</h3>
              <div className="space-y-2">
                {data.hotCelebs.map((celeb, i) => (
                  <div key={celeb.id} className="flex items-center gap-3 py-2 border-b border-violet-500/5 last:border-0">
                    <span className={`w-6 text-center font-bold ${i < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1">{celeb.name}</span>
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800 rounded">{celeb.category}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-cyan-400">{celeb.success}✓</span>
                      {celeb.failed > 0 && <span className="text-red-400">{celeb.failed}✗</span>}
                      <span className="text-gray-400">{celeb.count}次</span>
                    </div>
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        style={{ width: `${(celeb.count / (data.hotCelebs[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {data.hotCelebs.length === 0 && (
                  <p className="text-gray-500 text-center py-4">暂无生成数据</p>
                )}
              </div>
            </div>

            {/* Top Paths */}
            <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
              <h3 className="text-lg font-semibold mb-4">热门页面 TOP10</h3>
              <div className="space-y-2">
                {data.visitStats.topPaths.map((path, i) => (
                  <div key={path.path} className="flex items-center gap-3 py-2 border-b border-violet-500/5 last:border-0">
                    <span className={`w-6 text-center font-bold ${i < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 font-mono text-sm">{path.path}</span>
                    <span className="text-gray-400">{path.count}次</span>
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-violet-500"
                        style={{ width: `${(path.count / (data.visitStats.topPaths[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {data.visitStats.topPaths.length === 0 && (
                  <p className="text-gray-500 text-center py-4">暂无访问数据</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
            <h3 className="text-lg font-semibold mb-4">
              用户列表 ({summary.totalUsers}人)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-violet-500/20 text-gray-400">
                    <th className="text-left py-2 px-3">邮箱</th>
                    <th className="text-left py-2 px-3">邀请码</th>
                    <th className="text-left py-2 px-3">邀请人数</th>
                    <th className="text-left py-2 px-3">注册时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((user, i) => (
                    <tr key={i} className="border-b border-violet-500/5 hover:bg-violet-500/5">
                      <td className="py-2 px-3">{user.email}</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded text-xs">
                          {user.referralCode}
                        </span>
                      </td>
                      <td className="py-2 px-3">{user.inviteCount}</td>
                      <td className="py-2 px-3 text-gray-500">{new Date(user.createdAt).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                  {data.recentUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">暂无用户</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Generations Tab */}
        {activeTab === 'generations' && (
          <div className="space-y-4">
            {/* 图片网格 - 生成结果展示 */}
            <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
              <h3 className="text-lg font-semibold mb-4">最近生成图片</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.recentGenerations
                  .filter(g => g.imageUrl)
                  .slice(0, 8)
                  .map((gen, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-violet-500/10 hover:border-violet-500/40 transition-all bg-[#0f0f1a] cursor-pointer"
                      onClick={() => {
                        if (gen.hasArchivedUserImage || gen.hasArchivedResultImage) {
                          setViewingArchive(gen.time);
                        }
                      }}
                    >
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(gen.imageUrl!)}`}
                        alt={`${gen.celeb}`}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {gen.hasArchivedUserImage && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-green-500/80 text-white text-[10px] rounded">
                          📦已存档
                        </div>
                      )}
                      {gen.hasUserImage && !gen.hasArchivedUserImage && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-violet-500/80 text-white text-[10px] rounded">
                          有原图
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-xs text-white font-medium truncate">{gen.celeb}</p>
                          <p className="text-[10px] text-gray-300">{gen.user}</p>
                          <p className="text-[10px] text-gray-400">{new Date(gen.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                {data.recentGenerations.filter(g => g.imageUrl).length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">暂无图片</div>
                )}
              </div>
            </div>

            {/* 生成记录表格 */}
            <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
              <h3 className="text-lg font-semibold mb-4">生成记录 (最近20条)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-violet-500/20 text-gray-400">
                      <th className="text-left py-2 px-3">时间</th>
                      <th className="text-left py-2 px-3">用户</th>
                      <th className="text-left py-2 px-3">名人</th>
                      <th className="text-left py-2 px-3">状态</th>
                      <th className="text-left py-2 px-3">原图</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentGenerations.map((gen, i) => (
                      <tr key={i} className="border-b border-violet-500/5 hover:bg-violet-500/5">
                        <td className="py-2 px-3 text-gray-500">{new Date(gen.time).toLocaleString('zh-CN')}</td>
                        <td className="py-2 px-3">{gen.user}</td>
                        <td className="py-2 px-3">{gen.celeb}</td>
                        <td className="py-2 px-3">
                          {gen.success ? (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">成功</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">失败</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {gen.hasUserImage ? (
                            <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs">有</span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.recentGenerations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">暂无生成记录</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Celebrities Tab */}
        {activeTab === 'celebrities' && (
          <div className="space-y-4">
            <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
              <h3 className="text-lg font-semibold mb-4">
                名人状态管理 ({summary.activeCelebrities}在线 / {summary.disabledCelebrities}下线)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.celebrityStatus.map(celeb => (
                  <div
                    key={celeb.id}
                    className={`p-4 rounded-lg border ${
                      celeb.disabled
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-violet-500/20 bg-[#0f0f1a]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{celeb.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        celeb.disabled
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {celeb.disabled ? '已下线' : '在线'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span>{celeb.category}</span>
                      <span>·</span>
                      <span>热度 {celeb.hotness}</span>
                      {celeb.hasVariants && <span className="text-violet-400">· 多版本</span>}
                      {celeb.failCount > 0 && <span className="text-red-400">· 失败{celeb.failCount}次</span>}
                    </div>
                    <button
                      onClick={() => handleToggleCelebrity(celeb.id, celeb.disabled)}
                      className={`w-full py-1.5 text-xs rounded transition-colors ${
                        celeb.disabled
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {celeb.disabled ? '上线' : '下线'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/10 p-6">
            <h3 className="text-lg font-semibold mb-4">自我进化日志</h3>
            <div className="space-y-2">
              {data.evolutionLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-violet-500/5 text-sm">
                  <span className="text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    log.action.includes('disabled')
                      ? 'bg-red-500/20 text-red-400'
                      : log.action.includes('enabled')
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-violet-500/20 text-violet-400'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-gray-300">{log.celebrityId}</span>
                  <span className="text-gray-500">{log.reason}</span>
                </div>
              ))}
              {data.evolutionLogs.length === 0 && (
                <p className="text-gray-500 text-center py-4">暂无进化日志</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 存档图片查看模态框 */}
      {viewingArchive && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setViewingArchive(null);
            setArchiveData(null);
          }}
        >
          <div className="bg-[#1a1a2e] rounded-xl border border-violet-500/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">📦 存档图片查看</h3>
              <button
                onClick={() => {
                  setViewingArchive(null);
                  setArchiveData(null);
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {archiveLoading ? (
              <div className="text-center py-8 text-gray-500">加载中...</div>
            ) : archiveData?.error ? (
              <div className="text-center py-8 text-red-400">{archiveData.error}</div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-400">
                  <p>时间: {archiveData?.timestamp ? new Date(archiveData.timestamp).toLocaleString('zh-CN') : '-'}</p>
                  <p>用户: {archiveData?.email || '匿名用户'}</p>
                  <p>名人: {archiveData?.celebId || '-'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archiveData?.archivedUserImage && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">👤 用户原始照片</p>
                      <img
                        src={`data:image/jpeg;base64,${archiveData.archivedUserImage}`}
                        alt="用户原始照片"
                        className="w-full rounded-lg border border-violet-500/20"
                      />
                    </div>
                  )}
                  {archiveData?.archivedResultImage && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">🎨 AI生成合影</p>
                      <img
                        src={`data:image/jpeg;base64,${archiveData.archivedResultImage}`}
                        alt="AI生成合影"
                        className="w-full rounded-lg border border-violet-500/20"
                      />
                    </div>
                  )}
                </div>

                {!archiveData?.archivedUserImage && !archiveData?.archivedResultImage && (
                  <div className="text-center py-8 text-gray-500">暂无存档图片</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, change, changeLabel, color }: {
  title: string;
  value: number | string;
  change: number;
  changeLabel: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/30',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
    green: 'from-green-500/20 to-green-500/5 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.violet} rounded-xl border p-4`}>
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-1">
        {change > 0 ? '+' : ''}{change} {changeLabel}
      </p>
    </div>
  );
}
