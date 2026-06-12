const CACHE = {};

export async function loadMerged() {
  if (CACHE.merged) return CACHE.merged;
  const res = await fetch('/merged.json');
  const data = await res.json();
  CACHE.merged = data;
  return data;
}

export async function loadHeatmap() {
  if (CACHE.heatmap) return CACHE.heatmap;
  const res = await fetch('/heatmap.json');
  const data = await res.json();
  CACHE.heatmap = data;
  return data;
}

export function getScoreColor(score) {
  if (score >= 680) return '#ff2d55';
  if (score >= 650) return '#ff9500';
  if (score >= 620) return '#ffcc02';
  if (score >= 580) return '#34c759';
  if (score >= 530) return '#5ac8fa';
  if (score >= 480) return '#007aff';
  if (score >= 430) return '#5856d6';
  return '#8e8e93';
}

export function getScoreTier(score) {
  if (score >= 680) return '顶尖';
  if (score >= 650) return '优秀';
  if (score >= 620) return '良好';
  if (score >= 580) return '一本';
  if (score >= 530) return '二本';
  if (score >= 480) return '本科';
  if (score >= 430) return '专科';
  return '其他';
}

const YEAR_COLORS = { '2023': '#5ac8fa', '2024': '#ff9500', '2025': '#ff2d55' };
export function getYearColor(year) { return YEAR_COLORS[year] || '#8e8e93'; }

export function buildLocationMap(data) {
  const map = {}
  for (const r of data) {
    const p = r.school_province
    const c = r.school_city
    if (!p) continue
    if (!map[p]) map[p] = new Set()
    if (c) map[p].add(c)
  }
  const result = {}
  for (const [p, cities] of Object.entries(map)) {
    result[p] = [...cities].sort()
  }
  return result
}
