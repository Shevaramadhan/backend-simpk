import type { TaskBidang } from '@prisma/client';

interface WeightedTask {
  persentase: number;
  bobot: number;
}

export const BIDANG: TaskBidang[] = ['UI_UX', 'FRONTEND', 'BACKEND', 'INTEGRASI'];

// Progres = rata-rata persentase tugas berbobot (keputusan PM 14 Nov: bidang + bobot + persen). Tanpa tugas = 0.
export function projectProgress(tasks: WeightedTask[]): number {
  const totalBobot = tasks.reduce((sum, task) => sum + task.bobot, 0);
  if (!totalBobot) return 0;
  const total = tasks.reduce((sum, task) => sum + task.persentase * task.bobot, 0);
  return Math.round(total / totalBobot);
}

/** Progres tiap bidang. Bidang tanpa tugas bernilai null agar tampil "belum ada tugas", bukan 0%. */
export function progressByBidang(tasks: (WeightedTask & { bidang: TaskBidang })[]): Record<TaskBidang, number | null> {
  return Object.fromEntries(
    BIDANG.map((bidang) => {
      const inBidang = tasks.filter((task) => task.bidang === bidang);
      return [bidang, inBidang.length ? projectProgress(inBidang) : null];
    }),
  ) as Record<TaskBidang, number | null>;
}
