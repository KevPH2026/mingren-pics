import { NextRequest, NextResponse } from 'next/server';
import { getAllUserRecords, getGenerations, getVisitStats } from '@/lib/user-store';
import { isAdminSession } from '../login/route';
import { getAllCelebrityStatus, getEvolutionLogs } from '@/lib/self-evolution';
import { celebrities } from '@/lib/celebrities';

// GET /api/admin/dashboard — 综合仪表盘数据
export async function GET(req: NextRequest) {
  if (!isAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    
    // 用户数据
    const users = await getAllUserRecords();
    const realUsers = users.filter(u => !u.email.startsWith('admin_'));
    const totalUsers = realUsers.length;
    const todayUsers = realUsers.filter(u => u.createdAt.slice(0, 10) === todayStr);
    const yesterdayUsers = realUsers.filter(u => u.createdAt.slice(0, 10) === yesterdayStr);
    
    // 生成数据
    const gens = await getGenerations();
    const todayGens = gens.filter(g => g.timestamp.slice(0, 10) === todayStr);
    const yesterdayGens = gens.filter(g => g.timestamp.slice(0, 10) === yesterdayStr);
    
    const todaySuccess = todayGens.filter(g => g.success).length;
    const todayFailed = todayGens.filter(g => !g.success).length;
    const yesterdaySuccess = yesterdayGens.filter(g => g.success).length;
    const yesterdayFailed = yesterdayGens.filter(g => !g.success).length;
    
    // 访问统计
    const visitStats = await getVisitStats();
    
    // 名人热度排行（按生成次数）
    const celebStats: Record<string, { id: string; name: string; category: string; count: number; success: number; failed: number }> = {};
    for (const c of celebrities) {
      celebStats[c.id] = { id: c.id, name: c.name, category: c.category, count: 0, success: 0, failed: 0 };
    }
    
    for (const g of gens) {
      if (g.celebId && celebStats[g.celebId]) {
        celebStats[g.celebId].count++;
        if (g.success) celebStats[g.celebId].success++;
        else celebStats[g.celebId].failed++;
      }
    }
    
    const hotCelebs = Object.values(celebStats)
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // 最近7天趋势
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      return d.toISOString().slice(0, 10);
    });
    
    const dailyStats = last7Days.map(date => {
      const dayGens = gens.filter(g => g.timestamp.slice(0, 10) === date);
      const dayUsers = realUsers.filter(u => u.createdAt.slice(0, 10) === date);
      return {
        date,
        generations: dayGens.filter(g => g.success).length,
        failed: dayGens.filter(g => !g.success).length,
        newUsers: dayUsers.length,
      };
    });
    
    // 名人状态
    const celebStatus = await getAllCelebrityStatus();
    const disabledCount = Object.values(celebStatus).filter(s => s.disabled).length;
    
    // 进化日志
    const evolutionLogs = await getEvolutionLogs(20);
    
    return NextResponse.json({
      summary: {
        totalUsers,
        todayNewUsers: todayUsers.length,
        yesterdayNewUsers: yesterdayUsers.length,
        totalGenerations: gens.filter(g => g.success).length,
        todayGenerations: todaySuccess,
        todayFailed,
        yesterdayGenerations: yesterdaySuccess,
        yesterdayFailed,
        successRate: todayGens.length > 0 ? Math.round((todaySuccess / todayGens.length) * 100) : 0,
        activeCelebrities: celebrities.length - disabledCount,
        disabledCelebrities: disabledCount,
        // 访问统计
        totalVisits: visitStats.totalVisits,
        todayVisits: visitStats.todayVisits,
        onlineUsers: visitStats.onlineUsers,
        uniqueIPs: visitStats.uniqueIPs,
      },
      dailyStats,
      hotCelebs,
      visitStats: {
        totalVisits: visitStats.totalVisits,
        todayVisits: visitStats.todayVisits,
        onlineUsers: visitStats.onlineUsers,
        uniqueIPs: visitStats.uniqueIPs,
        topPaths: visitStats.topPaths,
      },
      recentUsers: todayUsers
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 10)
        .map(u => ({
          email: u.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          referralCode: u.referralCode,
          inviteCount: u.inviteCount,
          createdAt: u.createdAt,
        })),
      recentGenerations: gens
        .slice(-20)
        .reverse()
        .map(g => ({
          time: g.timestamp,
          user: g.email ? g.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '匿名用户',
          celeb: g.celebId || '-',
          success: g.success,
          imageUrl: g.imageUrl || null,
          hasUserImage: !!g.userImageUrl,
          hasArchivedUserImage: !!g.archivedUserImage,
          hasArchivedResultImage: !!g.archivedResultImage,
        })),
      evolutionLogs,
      celebrityStatus: celebrities.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category,
        hotness: c.hotness,
        disabled: celebStatus[c.id]?.disabled || false,
        failCount: celebStatus[c.id]?.failCount || 0,
        hasVariants: (c.promptVariants?.length || 0) > 0,
      })),
    });
  } catch (e: any) {
    console.error('Admin dashboard error:', e);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}
