---
date: 2026-10-09
title: "Ownership in the age of AI: building a personal agent uniquely mine"
draft: true
excerpt: "Notes on building and running uh Dingus, my personal AI assistant."
tags:
  - ai
  - agents
---

In [/posts/2026-10-03-the-sameness-of-ai](/posts/2026-10-03-the-sameness-of-ai/), I wrote about a lingering malaise about the lack of creativity in AI and how it feels like everyone is building the same thing. I also noted that... I personally do like and personal agents, and want to explore more about ownership in the age of AI and how I think that from individuals to companies, everyone should be taking a more active, aggressive role in owning their intelligence stack, from models, to harnesses, to agents, and everything required to build and run AI systems.

Now if you're an astute reader, and you probably are, you'll note the hypocricy of lambasting the lack of creativity on personal agents and then building one and writing about building one. OK I get that. But whether or not I _like_ it, I am pragmatic enough to recognize that while maybe it's not the future I want, it's the future that is getting built and it's important to not just have opinions, but go deep and stress test and evaluate them.

So in this post, I want to share a case study of sorts on why ownership of AI is so important and how you can own every single piece, by building your own personal agent. My hope is that in so doing you will gain a deeper understanding of how these systems are built, why they're interesting but not altogether novel, and how knowing how the pieces fit together perhaps you can build and assemble these pieces into something uniquely yours and better.

## A personal agent

The key pieces of a personal agent that are required for something non-trivial appear to be:

- a model (e.g. a large language model)
- a harness (e.g. a local model server)
- an agent (e.g. a rule-based agent)
