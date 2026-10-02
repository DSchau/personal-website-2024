/**
 * A tiny SVGO-style path compactor for the generated footer scene: rewrites
 * each path's data with relative commands (whichever of absolute/relative is
 * shorter), drops repeated command letters and redundant separators, and
 * rounds to one decimal. Handles the commands the scene emits: M L H V Z (and
 * their relative forms h v l m). Output renders identically.
 */

const fmt = (n: number) => {
  const s = String(Math.round(n * 10) / 10)
  return s.replace(/^(-?)0\./, '$1.')
}

/** join numbers with the fewest separators: "-" and "." can follow a number directly */
function join(nums: string[], prev: string) {
  let out = ''
  let last = prev
  for (const n of nums) {
    const needsSep = /[\d.]$/.test(last) && !n.startsWith('-') && !(n.startsWith('.') && /\.\d*$/.test(last))
    out += (needsSep ? ' ' : '') + n
    last = out
  }
  return out
}

export function compactPath(d: string): string {
  const tokens = d.match(/[MLHVZmlhvz]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  let i = 0
  let x = 0, y = 0, sx = 0, sy = 0
  let out = ''
  let lastCmd = ''
  // snap inputs to the output precision so relative steps don't accumulate rounding drift
  const num = () => Math.round(Number(tokens[i++]) * 10) / 10
  const isNum = () => i < tokens.length && !/[A-Za-z]/.test(tokens[i])
  const emit = (cmd: string, nums: string[]) => {
    // M followed by implicit pairs is treated as L, m as l: so after an m, l can be implicit too
    const implicit = cmd === lastCmd || (cmd === 'l' && lastCmd === 'm') || (cmd === 'L' && lastCmd === 'M')
    const prefix = implicit ? '' : cmd
    out += prefix + join(nums, prefix ? prefix : out)
    lastCmd = cmd
  }
  // pick absolute or relative, whichever is shorter
  const pick = (abs: string, absNums: number[], rel: string, relNums: number[]) => {
    const a = absNums.map(fmt), r = relNums.map(fmt)
    if (a.join(' ').length < r.join(' ').length) emit(abs, a)
    else emit(rel, r)
  }

  let cmd = ''
  while (i < tokens.length) {
    if (!isNum()) cmd = tokens[i++]
    switch (cmd) {
      case 'M': case 'm': {
        let nx = num(), ny = num()
        if (cmd === 'm') { nx += x; ny += y }
        // the very first move must be absolute; relative-from-origin is the same thing
        if (!out) emit('M', [fmt(nx), fmt(ny)])
        else pick('M', [nx, ny], 'm', [nx - x, ny - y])
        x = sx = nx; y = sy = ny
        // implicit pairs after M are L
        cmd = cmd === 'm' ? 'l' : 'L'
        break
      }
      case 'L': case 'l': {
        let nx = num(), ny = num()
        if (cmd === 'l') { nx += x; ny += y }
        const dx = nx - x, dy = ny - y
        if (Math.abs(dy) < 0.05 && dx !== 0) pick('H', [nx], 'h', [dx])
        else if (Math.abs(dx) < 0.05 && dy !== 0) pick('V', [ny], 'v', [dy])
        else pick('L', [nx, ny], 'l', [dx, dy])
        x = nx; y = ny
        break
      }
      case 'H': case 'h': {
        let nx = num()
        if (cmd === 'h') nx += x
        pick('H', [nx], 'h', [nx - x])
        x = nx
        break
      }
      case 'V': case 'v': {
        let ny = num()
        if (cmd === 'v') ny += y
        pick('V', [ny], 'v', [ny - y])
        y = ny
        break
      }
      case 'Z': case 'z':
        out += 'z'
        lastCmd = 'z'
        x = sx; y = sy
        break
      default:
        // unsupported command: leave the path untouched
        return d
    }
  }
  return out
}

/** compact every d="…" in a chunk of SVG markup */
export const compactPaths = (svg: string) => svg.replace(/ d="([^"]*)"/g, (_, d: string) => ` d="${compactPath(d)}"`)
