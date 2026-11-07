// Progres proyek = rata-rata persentase seluruh tugas (dibulatkan). Menunggu persetujuan System Analyst.
export function projectProgress(tasks: { persentase: number }[]): number {
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, task) => sum + task.persentase, 0);
  return Math.round(total / tasks.length);
}
