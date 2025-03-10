import { type APIRoute } from "astro";

import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

export const prerender = true;

const Tags = (list: string[]) => {
  return {
    type: 'ul',
    props: {
      style: {
        display: 'flex',
        listStyleType: 'none',
        padding: 0,
        margin: 0
      },
      children: (list || []).map(item => {
        return {
          type: 'li',
          props: {
            key: item,
            style: {
              fontFamily: 'SFPro',
              margin: 10,
              padding: 10,
              fontSize: 18,
              border: '1px solid black'
            },
            children: item
          }
        }
      })
    }
  }
}

const bio = {
  type: 'div',
  key: 'bio',
  props: {
    style: {
      display: 'flex',
      alignItems: 'center',
      padding: 20
    },
    children: [
      {
        type: 'img',
        props: {
          src: 'https://dschau-website.imgix.net/me.jpeg?w=64&h=64&fit=min&auto=format',
          style: {
            height: 64,
            width: 64,
            borderRadius: 12
          }
        }
      },
      {
        type: 'div',
        props: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: 10
          },
          children: [
            {
              type: 'h2',
              props: {
                style: {
                  fontFamily: 'Rockwell Bold',
                  margin: 0,
                  padding: 0,
                  fontSize: 30
                },
                children: 'Dustin Schau'
              }
            },
            {
              type: 'p',
              props: {
                children: 'Product & Engineering Leader',
                style: {
                  fontFamily: 'SFPro',
                  margin: 0,
                  padding: 0,
                  fontSize: 24
                }
              }
            }
          ]
        }
      }
    ],
  }
}

const footer = {
  type: 'div',
  props: {
    style: {
      display: 'flex',
      width: '100%',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    children: [
      {
        type: 'h3',
        props: {
          style: {
            fontSize: 36,
            padding: 24
          },
          children: 'dustinschau.com'
        }
      },
      bio,
    ]
  }
}

export const GET: APIRoute = async function GET({ request }) {
  const url = new URL(request.url)
  const urlParams = url.searchParams

  const title = urlParams.get('title') as string
  const tags = urlParams.get('tags')?.split(',') as string[]
  const type = urlParams.get('type') as string

  const params = {
    title,
    tags,
    type
  }

  const [rockwell, rockwellBold, sfPro] = await Promise.all([
    import('../../assets/fonts/Rockwell.ttf').then(mod => mod.default),
    import('../../assets/fonts/Rockwell-Bold.ttf').then(mod => mod.default),
    import('../../assets/fonts/SFPro.otf').then(mod => mod.default),
  ])
    .then(all => all.map(part => Buffer.from(part)))

  const html = {
    type: 'div',
    key: '1234',
    props: {
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            },
            children: [
              {
                type: 'h2',
                props: {
                  style: {
                    fontSize: 40,
                    margin: 0,
                    paddingTop: 24,
                    paddingBottom: 4
                  },
                  children: 'Blog'
                }
              },
              Tags(params.tags)
            ]
          }
        },
        {
          type: 'h1',
          props: {
            style: {
              fontSize: 72,
              padding: 24,
              paddingBottom: 72,
              textAlign: 'center'
            },
            children: params.title
          }
        },
        footer
      ],
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        backgroundImage: `radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)`,
        backgroundSize: '100px 100px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }
  }

  const svg = await satori(html, {
    width: 1200,
    height: 620,
    fonts: [
      {
        name: 'Rockwell Bold',
        data: rockwellBold,
        style: 'normal',
      },
      {
        name: 'Rockwell',
        data: rockwell,
        style: 'normal',
      },
      {
        name: 'SFPro',
        data: sfPro,
        style: 'normal'
      }
    ]
  })

  const resvg = new Resvg(svg);
  const pngData = resvg.render();

  const pngBuffer = pngData.asPng(); // Get PNG as buffer

  return new Response(pngBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': pngBuffer.byteLength.toString(),
    },
  });
}