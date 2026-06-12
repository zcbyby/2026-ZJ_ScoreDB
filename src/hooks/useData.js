import { useState, useEffect } from 'react';
import { loadMerged, loadHeatmap } from '../utils/data';

export function useData() {
  const [mergedData, setMergedData] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function load() {
      setProgress(30);
      const [merged, heatmap] = await Promise.all([
        loadMerged(),
        loadHeatmap(),
      ]);
      setProgress(80);
      setMergedData(merged);
      setHeatmapPoints(heatmap);
      setProgress(100);
      setLoading(false);
    }
    load();
  }, []);

  return { mergedData, heatmapPoints, loading, progress };
}
