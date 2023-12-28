interface Props {
  name: string;
  logo?: {
    src: string;
  };
}

export function Company({ name, logo }: Props) {
  return (
    <>
      {logo?.src && <img src={logo.src} alt={`Logo for ${name}`} style={{
        display: 'inline-block',
        verticalAlign: 'middle'
      }}/>}
      <span className={name.replace(/\s/g, '-').toLowerCase()}>{name}</span>
    </>
  )
}
