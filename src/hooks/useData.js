import { useState, useEffect } from 'react';
import { loadMerged, loadHeatmap } from '../utils/data';

export function useData() {
  const [mergedData, setMergedData] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false
    async function load() {
      setProgress(10)
      try {
        const [merged, heatmap] = await Promise.all([
          loadMerged(),
          loadHeatmap(),
        ])
        if (cancelled) return
        setProgress(80)
        setMergedData(merged)
        setHeatmapPoints(heatmap)
        setProgress(100)
        setLoading(false)
      } catch (e) {
        console.error('Data load failed, retrying with uncompressed:', e)
        try {
          const merged = await loadMerged()
          const heatmap = await loadHeatmap()
          if (cancelled) return
          setProgress(80)
          setMergedData(merged)
          setHeatmapPoints(heatmap)
          setProgress(100)
          setLoading(false)
        } catch (e2) {
          console.error('Data load failed entirely:', e2)
          if (!cancelled) setLoading(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, []);

  return { mergedData, heatmapPoints, loading, progress };
}
