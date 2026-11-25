// The posts list's title ····· date rows must stay inside each post link at
// every width, stacking the date under the title on narrow screens (#90).
import { test, expect } from '@playwright/test'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ORIGIN = 'http://site.test'
const DIST = new URL('../../dist/client/', import.meta.url).pathname

const TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
  '.xml': 'application/xml',
}

const exists = (path) => stat(path).then((s) => s.isFile(), () => false)

// serve dist/client straight from disk; block every other origin
async function openPosts(page, width) {
  await page.setViewportSize({ width, height: 800 })
  await page.unroute('**/*')
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== ORIGIN) return route.abort()
    let path = join(DIST, normalize(decodeURIComponent(url.pathname)))
    if (url.pathname.endsWith('/')) path = join(path, 'index.html')
    else if (!(await exists(path)) && (await exists(join(path, 'index.html')))) path = join(path, 'index.html')
    if (!path.startsWith(DIST) || !(await exists(path))) return route.fulfill({ status: 404, body: '' })
    return route.fulfill({
      body: await readFile(path),
      contentType: TYPES[extname(path)] ?? 'application/octet-stream',
    })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${ORIGIN}/posts/`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
}

test('every post title, date, tag line and excerpt stays inside its link', async ({ page }) => {
  for (const width of [320, 382, 385, 390, 594, 951]) {
    await openPosts(page, width)
    const { count, failures } = await page.evaluate(() => {
      const failures = []
      const links = [...document.querySelectorAll('ol.posts a.post')]
      for (const link of links) {
        const box = link.getBoundingClientRect()
        const css = getComputedStyle(link)
        const content = {
          left: box.left + parseFloat(css.paddingLeft),
          right: box.right - parseFloat(css.paddingRight),
        }
        for (const selector of ['.title', '.date', '.tags', '.excerpt']) {
          const el = link.querySelector(selector)
          if (!el) continue
          // text nodes only: icons are padded past their 1em slot on purpose (icon.module.css)
          const text = { left: Infinity, right: -Infinity }
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
          while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(walker.currentNode)
            for (const rect of range.getClientRects()) {
              text.left = Math.min(text.left, rect.left)
              text.right = Math.max(text.right, rect.right)
            }
          }
          if (text.left === Infinity) continue
          const problems = []
          if (text.left < content.left - 0.5 || text.right > content.right + 0.5) problems.push('outside link')
          if (text.left < -0.5 || text.right > window.innerWidth + 0.5) problems.push('outside viewport')
          if (el.scrollWidth > el.clientWidth + 1) problems.push('overflows its box')
          if (problems.length) {
            failures.push({
              href: link.getAttribute('href'),
              selector,
              problems,
              text: [Math.round(text.left), Math.round(text.right)],
              link: [Math.round(content.left), Math.round(content.right)],
            })
          }
        }
      }
      return { count: links.length, failures }
    })
    expect(count, 'posts listed').toBeGreaterThan(10)
    expect(failures, `at ${width}px`).toEqual([])
  }
})

test('narrow screens stack the date; wider ones keep the dotted leader row', async ({ page }) => {
  for (const [width, stacked] of [[320, true], [390, true], [594, false], [951, false]]) {
    await openPosts(page, width)
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('ol.posts .entry')].map((entry) => {
        const title = entry.querySelector('.title').getBoundingClientRect()
        const date = entry.querySelector('.date').getBoundingClientRect()
        const leader = entry.querySelector('.leader')
        return {
          leaderShown: getComputedStyle(leader).display !== 'none' && leader.getBoundingClientRect().width > 0,
          dateBelow: date.top >= title.bottom - 0.5,
          dateBeside: date.left >= title.right - 0.5,
        }
      }),
    )
    expect(rows.length).toBeGreaterThan(10)
    for (const row of rows) {
      if (stacked) expect(row, `at ${width}px`).toMatchObject({ leaderShown: false, dateBelow: true })
      else expect(row, `at ${width}px`).toMatchObject({ leaderShown: true, dateBeside: true })
    }
  }
})

test('narrow post rows look right', async ({ page }) => {
  const entries = {
    manning: 'a[href="/posts/css-in-js-with-styled-components-and-react-manning"]',
    external: 'a[href^="https://www.gatsbyjs.com/blog/2019-06-17"]',
  }
  for (const width of [320, 390]) {
    await openPosts(page, width)
    for (const [name, selector] of Object.entries(entries)) {
      const item = page.locator('ol.posts li').filter({ has: page.locator(selector) })
      await expect(item).toHaveScreenshot(`${name}-${width}.png`)
    }
  }
})
