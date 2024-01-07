import fs from 'fs/promises'
import path from 'path'
import { ImageResponse } from '@vercel/og';

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
      children: list.map(item => {
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

export async function GET() {
  const [rockwell, rockwellBold, sfPro] = await Promise.all([
    fs.readFile(
      path.resolve('./src/assets/fonts/Rockwell.ttf')
    ),
    fs.readFile(
      path.resolve('./src/assets/fonts/Rockwell-Bold.ttf')
    ),
    fs.readFile(
      path.resolve('./src/assets/fonts/SFPro.otf')
    )
  ])

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
                    fontSize: 32,
                    margin: 0,
                    paddingTop: 24,
                    paddingBottom: 4
                  },
                  children: 'Blog'
                }
              },
              Tags(['life', 'career']),
            ]
          }
        },
        {
          type: 'h1',
          props: {
            style: {
              fontSize: 72,
              paddingBottom: 72
            },
            children: '2023: Year in Review'
          }
        },
        bio
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
  return new ImageResponse(
    html,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Rockwell Bold',
          data: rockwellBold.buffer,
          style: 'normal',
        },
        {
          name: 'Rockwell',
          data: rockwell.buffer,
          style: 'normal',
        },
        {
          name: 'SFPro',
          data: sfPro.buffer,
          style: 'normal'
        }
      ],
    },
  );
}