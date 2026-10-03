---
date: 2026-10-03
title: "New beginnings"
author: Dustin Schau
featured: false
excerpt: "I left a good job with good people to figure out something... different, and maybe better!"
tags:
  - career
  - ai
---

Earlier in the month, I decided to resign from my job at [Adapt](https://adapt.com). I haven't done this in my career before where I've left something without having something else lined up and I can honestly not recall a period where I haven't worked full-time since high school. But... I knew it was time, and I knew I was ready for something different.

## Why?

Well, I don't know. I wish there was a grand plan or some master strategy behind it, but the job at Adapt was good, the team was great, and the product was interesting and exciting. If I had to boil it down to a few reasons, it probably would take the shape of something like:

1. A bit of exhaustion of some of the sameness of AI. AI solves real problems, but there's a lot of noise and it felt sometimes like chasing trends instead of doing durably great work, and
2. It has never been harder to break out. AI makes creation (content, products, etc.) easy, but also creators and voices on social media seem _required_ to break out of the AI noise, and
3. The competition was fierce. I relish a competition, but with competitors from frontier labs, to some of the hottest startups in Silicon Valley, I wasn't convinced we had a path to break out.

I wish the team well. I know everyone says this, but I'll be rooting for them to be wildly successful, and I mean it! Just because _my_ risk tolerance was lower doesn't mean that the risk is insurmountable, and I'm deeply hopeful they break out because it's a great product built by good people who are innovating. I am also thankful for the opportunity to work alongside the team, and while it was a short stint, I learned much about AI-native development, modern AI practices, and had a front-row seat to building on the frontier of modern AI development.

## The sameness of AI

To dive deeper into this first bullet point (which is in some sense linked with competition), one thing I feel is sorely missing right now in the field of AI is _creativity_. When I look at what has broken out, there are the first movers who have their own advantages, and then a number of followers. But genuinely novel innovations and exciting, creative product ideas are few and far between. When they do occur, the industry gravitates towards them but then as has become apparent with AI, the ability to follow and build (while coding isn't solved, it's a damn sight easier!) by others comes quickly after.

When I look at some of the trends I've been seeing, a few patterns have emerged:

- Single-player vs. multi-player. No team or company "agent" has broken out in a meaningful way, and what seems to be en vogue now is a personal agent (Instinct, Muse, Grokbot, Dots from OpenAI). I don't think either is right, but I do think AI is too siloed to the individual right now.
- Models are quickly becoming commodities. Switching costs are low, and it's more or less just preference at this point. When something new comes along that is meaningfully differentiated (cheaper open-weight models that have "frontier-grade" benchmark scores and Jev with novel ideas around more deterministic outputs as two such examples), that causes waves in the industry but the models themselves are increasingly able to be swapped from one lab to another (or from a frontier lab to an open-weight model).
- The application layer is the next battleground. It's clear that frontier labs needed to compete beyond the model into areas of stickier business-focused use cases (the "app" layer) with things like data integrations, team-based workflows (skills, shared connections, etc.), and app integrations (Slack apps). I think the infra layer may be key here as well (sandboxes, computer use, and so forth).

All of this is theoretically interesting and exciting, but as noted above it's also a little exhausting. When I look back over the past few months, it feels to me a little like as an industry research and innovation has taken a back seat to capitalism. We're all building the same thing and it is frankly disappointing that with all the brightest minds in the world competing in AI that this is the net sum of our collective creativity.

As a recent example, a new category of AI seems to be emerging that of the personal assistant or personal agent. There have been viral breakouts like Instinct, Grokbot, Muse, and Dots but more or less, they're all the same thing. 

At their center, they all have the same shared concepts:

- A harness. The agent loop: call the model, run its tool calls, feed back the results, and manage context.
- Vault. A way to securely access stored user credentials to access data, logins, etc.
- A sandbox / microVM. A sandbox where the models can do work, access credentials securely, and run custom code.
- A browser. A browser that can be automated to perform work on your behalf that requires a browser (book travel, complete forms, etc.).
- Transactions / payments. A way to securely perform transactions with an approval step (oftentimes Stripe Link).
- Tasks. A way to persist a task / goal and have the agent pursue it until complete ("Find me the Odyssey tickets in IMAX, make no mistakes!").

![Instinct, Muse, Grokbot, and Dots all share the same architecture: a task (a one-off request or a persistent goal) drives a harness (the agent loop), which talks to a swappable model, asks you for approvals, and calls the same four tools: a credential vault, a sandbox or microVM, an automated browser, and payments.](./architecture.svg)

One interesting note for myself -- and I think genuinely for others -- is that because they're all the same thing more or less, the switching costs are incredibly low. I used Instinct and genuinely liked it (it found me Dune tickets in IMAX!!), but when I saw some speculative security concerns, it made me realize that I probably shouldn't trust it with my personal data.[^1] So... I switched to Meta's Muse 😅 And I have not found myself lacking any capabilities whatsoever.

![My "Dingus" agent powered by Muse](./images/muse.jpg)

All of the sameness in these product capabilities do however create a genuinely useful manifestation of AI as a personal assistant of sorts where there can be real(ish?) productivity gains. But most of the examples being touted online are more like vitamins than painkillers. Booking a flight is not that hard, and [booking it with an agent is not a 10x improvement](https://x.com/OpenAIDevs/status/2105708732323909827?s=20). Further still, as humans, we sometimes enjoy the task of selection -- it activates our hunter-gatherer brain! -- (like finding a meal on DoorDash, or browsing an e-commerce website for the perfect product) and so while maybe a personal agent can reduce the time spent in some of these tasks, it makes me wonder... are we going to be happy with that time savings? If we're not, why we would pursue and use products that make us productive but joyless.

## What's next?

In the space: I don't know. I hope something better :) I aim to take a few months to advise some awesome companies (like my friends at [Mastra](https://mastra.ai)) and reserve a little thinking time of my own to recharge, think, strategize, and be part of the solution. I hope in so doing that I will find myself creatively energized, inspired, and ready to build something I deeply believe in. Specifically, I am to focus on the following areas:

- Ownership of AI. I really find open-source, open-weight, and flexible ownership and switching to be an underrated area right now (like this recent [Underdog launch](https://x.com/0xSigil/status/2106067365733790032?s=20) as an example) and want to explore it further
- AI primitives. Sandboxes, browsers, the core building blocks of AI I want to use directly by building my own agents and exploring what I like, what I dislike, and maybe what's missing
- AI automation. Factories and the process of automation of inputs, guardrails, and outputs is something I've always enjoyed (before AI even!)
  - As a sub-category of this, I'm particularly interested in exploring whether AI "slop" in open-source projects can be improved

While I figure this all out and explore, if you're interested in working with me in any capacity I am doing part-time arrangements and small consulting projects (a few hours per week) and would love to help out. If that sounds interesting or if you just want to say hello, [email me and let's chat!](mailto:me@dustinschau.com)

[^1]: These have since been debunked and I think were fairly unfounded (e.g. it was a model hallucinating not a customer breach).
