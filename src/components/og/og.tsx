import React from "react"

const Tags = ({ tags }: { tags: string[] }) => {
  return (
    <ul
      style={{
        display: "flex",
        listStyleType: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {(tags || []).map((item) => (
        <li
          key={item}
          style={{
            fontFamily: "Rockwell",
            margin: 10,
            padding: 10,
            fontSize: 18,
            border: "1px solid black",
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
};

const Bio = ({ avatarUrl }: { avatarUrl?: string }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: 20,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          width={64}
          height={64}
          style={{
            height: 64,
            width: 64,
            borderRadius: 12,
          }}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 10,
        }}
      >
        <h2
          style={{
            fontFamily: "Rockwell Bold",
            margin: 0,
            padding: 0,
            fontSize: 30,
          }}
        >
          Dustin Schau
        </h2>
        <p
          style={{
            fontFamily: "Rockwell",
            margin: 0,
            padding: 0,
            fontSize: 24,
          }}
        >
          Product & Engineering Leader
        </p>
      </div>
    </div>
  );
};

const Footer = ({ avatarUrl }: { avatarUrl?: string }) => {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <h3
        style={{
          fontSize: 36,
          padding: 24,
        }}
      >
        dustinschau.com
      </h3>
      <Bio avatarUrl={avatarUrl} />
    </div>
  );
};

export const OG = ({
  tags,
  title,
  avatarUrl = "",
}: {
  tags?: string[];
  title?: string | null;
  avatarUrl?: string;
}) => (
  <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "white",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: 40,
              margin: 0,
              paddingTop: 24,
              paddingBottom: 4,
            }}
          >
            Blog
          </h2>
          <Tags tags={tags} />
        </div>
        <h1
          style={{
            fontSize: 72,
            padding: 24,
            paddingBottom: 72,
            textAlign: "center",
          }}
        >
          {title}
        </h1>
        <Footer avatarUrl={avatarUrl} />
      </div>
)