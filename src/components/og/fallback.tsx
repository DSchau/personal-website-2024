import React from "react";

export const FallbackOG = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: "#f3eee4",
      justifyContent: "space-between",
      padding: 48,
    }}
  >
    <div
      style={{
        display: "flex",
        fontFamily: "SFPro",
        fontSize: 20,
        letterSpacing: 4,
        color: "#8c8578",
      }}
    >
      {eyebrow}
    </div>
    <div
      style={{
        display: "flex",
        fontFamily: "Rockwell Bold",
        fontSize: 64,
        color: "#2e2a24",
      }}
    >
      {title}
    </div>
    <div
      style={{
        display: "flex",
        fontFamily: "Rockwell",
        fontSize: 32,
        color: "#2e2a24",
      }}
    >
      {subtitle}
    </div>
  </div>
);
