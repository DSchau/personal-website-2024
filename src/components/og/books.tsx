import React from "react";

export interface BooksOgBook {
  title: string;
  author: string;
  imageUrl: string;
}

function shortTitle(title: string): string {
  return title.replace(/\s+\(.*\)$/, "");
}

function Cover({ book }: { book: BooksOgBook }) {
  const width = 140;
  const height = 210;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width,
        marginLeft: 16,
        marginRight: 16,
      }}
    >
      {book.imageUrl ? (
        <img
          src={book.imageUrl}
          width={width}
          height={height}
          style={{
            objectFit: "cover",
            width,
            height,
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            width,
            height,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#2a2420",
            color: "#e8dfd2",
            fontFamily: "Rockwell",
            fontSize: 16,
            padding: 10,
            textAlign: "center",
          }}
        >
          {shortTitle(book.title)}
        </div>
      )}
    </div>
  );
}

export const BooksOG = ({
  books,
}: {
  books: BooksOgBook[];
  avatarUrl?: string;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: "#f3eee4",
      justifyContent: "space-between",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        paddingTop: 36,
        fontFamily: "Rockwell",
        fontSize: 18,
        letterSpacing: 4,
        color: "#8c8578",
      }}
    >
      RECENTLY FINISHED
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      {books.map((book, index) => (
        <Cover key={`${book.title}-${index}`} book={book} />
      ))}
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        fontFamily: "Rockwell Bold",
        fontSize: 32,
        paddingBottom: 36,
        color: "#2e2a24",
      }}
    >
      dustinschau.com/books
    </div>
  </div>
);
