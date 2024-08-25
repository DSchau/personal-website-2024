const { CF_PAGES } = process.env as { [key: string]: any }

export const getSvgRenderer = async () => {
  console.log(CF_PAGES, process.env)

  const { Resvg } = await import('@resvg/resvg-js')

  return Resvg
}
