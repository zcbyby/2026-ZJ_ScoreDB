function nocache(url) {
  const sep = url.includes('?') ? '&' : '?'
  return url + sep + 't=' + Date.now()
}

export async function loadMerged() {
  const res = await fetch(nocache('/merged.json'));
  const data = await res.json();
  return data;
}

export async function loadHeatmap() {
  const res = await fetch(nocache('/heatmap.json'));
  const data = await res.json();
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

const YEAR_COLORS = { '2023': '#007aff', '2024': '#34c759', '2025': '#ff3b30' };
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
