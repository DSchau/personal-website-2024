type PostFlags = { draft?: boolean; unlisted?: boolean };

// drafts get a page only outside production (dev preview)
export const isRoutable = (data: PostFlags, prod: boolean) => !prod || data.draft !== true;

// unlisted posts keep their URL but stay out of /posts, the homepage and RSS
export const isListed = (data: PostFlags, prod: boolean) => isRoutable(data, prod) && data.unlisted !== true;
