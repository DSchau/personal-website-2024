import fs from 'fs/promises'
import path from 'path'
import { ImageResponse } from '@vercel/og';

export async function GET() {
  const [rockwell, rockwellBold] = await Promise.all([
    fs.readFile(
      path.resolve('./src/assets/fonts/Rockwell.ttf')
    ),
    fs.readFile(
      path.resolve('./src/assets/fonts/Rockwell-Bold.ttf')
    )
  ])

  const bio = {
    type: 'div',
    key: 'bio',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center'
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
                    fontFamily: 'Rockwell',
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
        alignItems: 'center',
        justifyContent: 'center'
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
      ],
    },
  );
}