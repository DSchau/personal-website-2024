const { CF_PAGES } = process.env as { [key: string]: any }

export const getSvgRenderer = async () => {
  console.log(CF_PAGES, process.env)

  if (CF_PAGES === '1') {
    return {}
  }

  const { Resvg } = await import('@resvg/resvg-js')

  return Resvg
}
