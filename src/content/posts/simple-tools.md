---
date: 2024-01-29
title: "Modern web development and the value of simple tools"
author: Dustin Schau
draft: true
excerpt: "In 2024, the choice of development teams on which framework they use seems increasingly murky. The choices seem to be skewing towards complex and development teams are caught in the middle. What should you do? What can you do? Read this post to learn more."
tags:
  - react
  - javascript
  - web
  - simplicity
---

> First, Hauptly states, understand the reason people use a product or service. Next, lay out the steps the customer must take to get the job done. Finally, once the series of tasks from intention to outcome is understood, simply start removing steps until you reach the simplest possible process.
>
> Nir Eyal in "Hooked: How to Build Habit-Forming Products"

I have been thinking a lot about simplicity. If a product, tool, or service isn't simple, users will gravitate towards a solution that is. Sometimes, powerful tools can win a category if the power that it affords the user is worth it. Worth it is ultimately defined by the user, but common reasons could be around: flexibility, customizability, performance, or scalability.

To use a concrete example: you don't rewrite a layer of your stack in C (or Rust, Go, etc.) unless you have a need for low-level performance coupled with the technical expertise and experience to solve a problem concretely with that technical choice.

Now let me state my thesis: modern web, particularly Next.js, is skewing towards complexity. This may be a perfectly rational business decision for Vercel, the company, but it may be a terrible decision for you, the user. Why? Next.js, particularly the latest version with support for React Server Components, introduces complexity that you may not need for your website or web app.

## What problem are you solving?

First, when we think about simplicity, think deeply about the problem that you are solving. We tend to think in terms of what your tech stack can do, instead of what your user and business needs. Frankly, this is a terrible way to make decisions. Are you building an e-commerce website that needs to do real-time updates to Product SKUs and inventory or are you building a largely static website that gets updates weekly, not by the second? Choosing a singular tool to do both of these wildly different use cases may indicate a needlessly complex solution that will require more steps for you, the user, to build and maintain.

When I think about the kinds of websites (and web apps) that teams are building, I tend to find thinking in terms of a spectrum helpful. On one end of the spectrum, we have simple, static websites. On the other hand, we have true dynamic, web applications.

### Static <-------> Dynamic

On the left end of the spectrum we have the developer blog. On the right, we have something like Airbnb. What end of the spectrum does your use case skew towards truly? Can you make some trade-offs to skew left, or do you have true, well-defined business objectives that need a dynamic (and more complex) solution?

By deeply understanding the business case for the kind of application you need to be building, you can then back into a tool choice that is more purpose built to solve that use case. Why? Because the builder of that tool deeply understands the job that the user choosing that tool is solving, and removes steps to make that user as successful as possible. In 2024, there seems to be emergent tools that are innovating in these areas.

For building a static website that is focused on performance, consider [**Astro**](https://astro.build). It ships zero JavaScript by default, and integrates well with modern libraries and tools, as well as deployment platforms, to enable you to _simply_ deploy your static website.

For building a real-time, dynamic app-like experience, consider [**Remix**](https://remix.run/). It is server-rendered by default (although the team is investigating a [_simpler_ way to deploy a single-page app experience](https://remix.run/docs/en/main/future/spa-mode)), and seems purpose built for applications that skew dynamic.

The interesting nature of both of these tools is that they are designed for one end of the spectrum but are flexible enough that they can be used for a sprinkling of use cases that you may have that are right or left of your chosen place on the spectrum. As an example with Astro you can use a hybrid (or full server!) rendering mode that can render certain routes entirely on the server. With Remix soon you will be able to deploy it in a single-page app like environment.

Where does this leave Next.js? Caught in the middle. It is something for everyone, which means that it is something amazing for no one.

It seems evident in observing the macro trends of the frontend race how we got here. When we look back several years, Gatsby was the singular React-based meta-framework that innovated in static site generation (standing on the shoulders of giants like Hugo, Jekyll, and so on). Next.js started on the other side of the spectrum, fully dynamic. Over time, the Next.js team did a great job of listening to their customers, understanding their use cases, and slowly began to build more static exporting functionalities, including the getStaticProps and ISG rendering mode. While this is speculative, I believe that Remix cornered a more monetizable segment (and more complex!) corner of the market and Vercel scrambled to come up with something better for that particular market segment.

### The steps the customer must take

Regardless of framework or spectrum, all websites must be built, deployed, and monitored. The complexity of each of these steps varies on your choices and means that you must be confident that your team is choosing good tools to make this as simple as possible _and_ that the lower-level tools (libraries, frameworks, etc.) are not introducing undue complexity.

Both Astro and Remix have followed an adapter pattern. This means that when you're using modern deployment solutions like Netlify, Vercel, and Cloudflare Pages they frequently _just work_ because their deployment needs are well-documented, well-understood, and well implemented by either the team behind the framework or the deployment platform itself.

When you use Next.js, you'll get a hundred devrels "well actually"ing you about [how you can use Docker to deploy Next.js sites](https://nextjs.org/docs/pages/building-your-application/deploying) or that it really isn't all that complex to deploy a Next.js site. While true, it's misleading and understates the inherent complexity for teams given this challenge. Deploying Next.js with Docker in 2024 is analogous to telling a bridge builder "Well, I gave you a blueprint, it's not that hard right?" There is much complexity in building, deploying, maintaining, and observing a Next.js application and tipping the approach to server-first with React Server Components only increases this complexity.

Thus, where the best frameworks of the modern era have given developers an incredible amount of power and sophistication, some (cough cough: Next.js) have also _increased_ the number of steps to get to a scalable, secure, performant application especially if you're self-hosting or using AWS or GCP. This increased complexity has to be worth some of the aforementioned benefits (scalability).

## Pick one: simplicity or spend

When I think about simplicity and the choices a development team makes on a greenfield project, it is fraught with trade-offs and there's really no clear, well-paved path. You ultimately have two options, one of which optimizes for infrastructure spend and the other which optimizes for developer time and productivity.

1. **Self-hosted**. If you use bare-metal AWS, GCP, or something similar you will need to build, maintain, and support a deployment pipeline for the lifetime of your web application. It increases development time _and_ the # of deployment steps, but likely it will cost you less from an infrastructure standpoint over time.
    - Worth also noting other solutions like [SST](https://github.com/sst/sst#readme) which are tailor made to make self-hosting modern frameworks easier
1. **Modern deployment solution**. You could use a tool like Netlify, Vercel, or Cloudflare Pages to host your application. These tools are all genuinely great, but they need to grow into their high valuations ($2B for Netlify, $2.2B for Vercel) and over time the more you use of the platform, the more you will pay for it. Ultimately, these tools exist to abstract the (created) complexity of modern frameworks.

In all of technology, you're always making trade-offs so this is nothing new. What's new is the trend towards complexity that increasingly necessitates a choice like #2. Next.js with React Server Components is a more complex solution (more steps, more time for deployment) that is directly in the middle of the static vs. dynamic spectrum.

## Closing

Some tools (Astro, Remix) in 2024 have embraced simplicity and carved out a well-defined niche on one end of the static vs. dynamic spectrum. These tools are excellent and exemplify the best of the modern web and a deep understanding of their customer.

Other tools (Next.js) in 2024 do not. They are designed for a use case that is intentionally wide, and that is nigh impossible to deliver a simpler (less steps, less time to deploy) solution without using purpose-built tooling to tame the complexity.

I'd ask myself in 2024: do I need the complexity?
