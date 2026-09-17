import type { Site, Metadata, Socials } from "@types";

export const SITE: Site = {
  NAME: "Shane.",
  TITLE: "简说笔记",
  SEO_NAME: "简说笔记 | Shane",
  EMAIL: "",
  NUM_POSTS_ON_HOMEPAGE: 4,
  NUM_WORKS_ON_HOMEPAGE: 3,
  NUM_PROJECTS_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION: "记录技术与项目，也记录一些长期值得留下的东西。",
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
