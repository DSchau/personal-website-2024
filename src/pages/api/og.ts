import fs from 'fs/promises'
import path from 'path'
import { ImageResponse } from '@vercel/og';


export async function GET() {
  const fontData = await fs.readFile(
    path.resolve('./src/assets/fonts/Rockwell.ttf')
  )

  const html = {
    type: 'div',
    key: '1234',
    props: {
      children: 'Dustin Schau',
      style: {
        fontSize: 72,
        fontFamily: `Rockwell`,
        color: 'black',
        background: 'white',
        width: '100%',
        height: '100%',
        padding: '50px 200px',
        textAlign: 'center',
        justifyContent: 'center',
        alignItems: 'center',
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
          name: 'Rockwell',
          data: fontData.buffer,
          style: 'normal',
        },
      ],
    },
  );
}