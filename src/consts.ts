import type { Site, Metadata, Socials } from "@types";

export const SITE: Site = {
  NAME: "Shane.",
  TITLE: "简说技术",
  SEO_NAME: "简说技术 | Shane's Personal Site",
  EMAIL: "",
  NUM_POSTS_ON_HOMEPAGE: 4,
  NUM_WORKS_ON_HOMEPAGE: 3,
  NUM_PROJECTS_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION: "Shane 的个人技术网站：记录技术、项目，以及一些长期值得留下的东西。",
};

export const BLOG: Metadata = {
  TITLE: "Blog",
  DESCRIPTION: "Writing about software, systems and things I learn.",
};

export const PROJECTS: Metadata = {
  TITLE: "Projects",
  DESCRIPTION: "个人项目与开源作品。",
};

export const ABOUT: Metadata = {
  TITLE: "About",
  DESCRIPTION: "About Shane — Software Engineer focusing on C++, AI Infra and LLM Systems.",
};

export const WORK: Metadata = {
  TITLE: "Experience",
  DESCRIPTION: "Where I have worked and what I have done.",
};

export const SOCIALS: Socials = [
  {
    NAME: "GitHub",
    HREF: "https://github.com/holtwood",
  },
];
