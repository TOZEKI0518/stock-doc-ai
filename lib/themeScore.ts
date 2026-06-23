export function calculateThemeScore(themes: string[]) {
  let score = 50;

  const boosts: Record<string, number> = {
    AI: 25,
    "生成AI": 25,

    半導体: 20,
    "半導体材料": 18,
    "半導体製造装置": 22,
    "パワー半導体": 18,
    "検査装置": 16,
    EUV: 16,
    "パッケージ基板": 16,

    データセンター: 20,
    IOWN: 14,
    DX: 10,

    防衛: 18,
    宇宙: 14,

    電力: 15,
    原子力: 15,
    エネルギー: 10,
    水素: 10,

    光ファイバー: 18,
    光配線: 18,
    電線: 12,

    ロボット: 12,
    FA: 10,

    高配当: 10,
    金利上昇: 8,
  };

  for (const theme of themes) {
    score += boosts[theme] ?? 0;
  }

  return Math.min(Math.max(Math.round(score), 0), 100);
}
