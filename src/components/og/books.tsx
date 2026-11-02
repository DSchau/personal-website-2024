export interface BooksOgBook {
  title: string;
  author: string;
  imageUrl: string;
}

const TILT_SHIFTS = [8, 0, 14, 4, 10];

function shortTitle(title: string): string {
  return title.replace(/\s+\(.*\)$/, "");
}

function BookMockup({
  book,
  index,
}: {
  book: BooksOgBook;
  index: number;
}) {
  const height = 248 + (index % 3) * 10;
  const coverWidth = 154;
  const spineWidth = 16;
  const pageWidth = 11;
  const lift = TILT_SHIFTS[index] ?? 6;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: lift,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height,
          boxShadow: "0 24px 32px rgba(74, 46, 16, 0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: spineWidth,
            background:
              "linear-gradient(90deg, #14110f 0%, #3a322c 46%, #241e1a 100%)",
            borderTopLeftRadius: 3,
            borderBottomLeftRadius: 3,
          }}
        />
        {book.imageUrl ? (
          <img
            src={book.imageUrl}
            width={coverWidth}
            height={height}
            style={{
              objectFit: "cover",
              width: coverWidth,
              height,
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              width: coverWidth,
              height,
              alignItems: "center",
              justifyContent: "center",
              background: "#2a2420",
              color: "#e8dfd2",
              fontFamily: "Geist Serif",
              fontSize: 18,
              padding: 12,
              textAlign: "center",
            }}
          >
            {shortTitle(book.title)}
          </div>
        )}
        <div
          style={{
            display: "flex",
            width: pageWidth,
            background:
              "linear-gradient(90deg, #d8cdb6 0%, #f4ebda 48%, #e8deca 100%)",
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

export const BooksOG = ({ books }: { books: BooksOgBook[] }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      backgroundColor: "#f3eee4",
      backgroundImage:
        "radial-gradient(circle at 50% 0%, #fbf8f2 0%, #f3eee4 60%)",
      justifyContent: "space-between",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        paddingTop: 28,
        fontFamily: "SFPro",
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
        gap: 26,
        paddingLeft: 48,
        paddingRight: 48,
      }}
    >
      {books.map((book, index) => (
        <BookMockup key={`${book.title}-${index}`} book={book} index={index} />
      ))}
    </div>
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
          fontFamily: "Geist Serif",
          fontWeight: 400,
          fontSize: 34,
          padding: "24px 28px 30px",
          margin: 0,
          color: "#2e2a24",
        }}
      >
        dustinschau.com/books
      </h3>
    </div>
  </div>
);
