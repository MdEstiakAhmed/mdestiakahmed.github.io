// Single source of truth for the revamp. No copy lives in markup.
import type { ImageMetadata } from 'astro';

import driversEdDark from '@/assets/projects/drivers-ed-dark.webp';
import driversEdLight from '@/assets/projects/drivers-ed-light.webp';
import orcastaDark from '@/assets/projects/orcasta-dark.webp';
import orcastaLight from '@/assets/projects/orcasta-light.webp';
import pickclickDark from '@/assets/projects/pickclick-dark.webp';
import pickclickLight from '@/assets/projects/pickclick-light.webp';

export type Role = 'Full-Stack' | 'Frontend';

export interface Social {
  id: 'linkedin' | 'github' | 'x' | 'facebook' | 'instagram' | 'whatsapp';
  label: string;
  href: string;
}

export interface Position {
  title: string;
  start: string; // ISO yyyy-mm
  end: string | null; // null = present
}

export interface WorkProject {
  name: string;
  description: string;
  url?: string;
}

export interface ExperienceItem {
  company: string;
  url: string;
  formerly?: string[]; // previous names of the same company
  location: string;
  positions: Position[]; // newest first; promotions within the company
  bullets: string[];
  projects?: WorkProject[];
  stack: string[];
}

export interface Project {
  slug: string;
  title: string;
  summary: string;
  role: Role;
  type: 'Freelance';
  stack: string[];
  links: { label: string; href: string }[];
  highlights: string[];
  image: { light: ImageMetadata; dark: ImageMetadata }; // 1280x800 logo tiles, one per theme
}

export interface EducationItem {
  institute: string;
  credential: string;
  start: number;
  end: number;
}

export interface Service {
  title: string;
  description: string;
  icon: string;
}

export interface SkillGroup {
  group: string;
  items: string[];
}

export const CAREER_START = { year: 2020, month: 12 } as const; // SoftX Innovation, per LinkedIn

export const yearsOfExperience = (now: Date = new Date()): number =>
  Math.floor(
    (now.getFullYear() * 12 +
      now.getMonth() -
      (CAREER_START.year * 12 + (CAREER_START.month - 1))) /
      12,
  );

export const profile = {
  name: 'Md. Estiak Ahmed',
  shortName: 'Estiak',
  title: 'Frontend-focused Full-Stack Engineer',
  typingRoles: ['Frontend Wizard', 'Code Craftsman'],
  tagline: 'React, Next.js, TypeScript and NestJS. Based in Dhaka, Bangladesh.',
  location: 'Dhaka, Bangladesh',
  email: 'estiak97@gmail.com',
  website: 'https://estiak.me',
  cv: 'https://drive.google.com/file/d/1G0tTU6Krfr_moptuvdmmIzqDoSjYglaN/view?usp=drive_link',
  availability: { open: true, label: 'Open to freelance' },
  // birthday + plain-text phone intentionally removed
  whatsapp: 'https://wa.me/8801766461990',
  bio: [
    'I am a software engineer from Dhaka, Bangladesh, with 5+ years of experience building for the web. My focus is the frontend: React, Next.js, TypeScript and SvelteKit, from micro-frontends to component libraries.',
    'I also build the other half. I design and ship APIs with Node.js and NestJS, model data with TypeORM on Postgres and MySQL, and automate delivery with Docker and GitHub Actions.',
  ],
} as const;

export interface Stat {
  label: string;
  value: () => number;
  suffix: string;
}

export const stats: Stat[] = [
  { label: 'Years Experience', value: () => yearsOfExperience(), suffix: '+' },
  { label: 'Clients', value: () => 7, suffix: '+' },
  { label: 'Projects', value: () => 12, suffix: '+' },
];

/** Shown in the About bento "currently" tile. */
export const now = {
  company: 'Vivasoft',
  building: 'Stickler, a live-stream analytics dashboard',
  timeZone: 'Asia/Dhaka',
} as const;

export const socials: Social[] = [
  { id: 'github', label: 'GitHub', href: 'https://github.com/MdEstiakAhmed' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/mdestiakahmed' },
  { id: 'x', label: 'X', href: 'https://twitter.com/Md_Estiak_Ahmed' },
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/MdEstiakAhmed1997' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/estiakahmed' },
  { id: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/8801766461990' },
];

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Services', href: '#services' },
  { label: 'Contact', href: '#contact' },
] as const;

// Source: LinkedIn profile export (Oct 2026). Stack tags inferred from the bullets.
export const experience: ExperienceItem[] = [
  {
    company: 'Vivasoft Limited',
    url: 'https://vivasoftltd.com/',
    location: 'Banani, Dhaka',
    positions: [{ title: 'Software Engineer L-II', start: '2024-04', end: null }],
    bullets: [
      'Building a live-stream analytics dashboard for TikTok and Shopee data.',
      'Shipped an HRM product on a micro-frontend architecture with React and RTK Query.',
      "Contributed to VIVAKITS, the company's open-source React component library.",
    ],
    projects: [
      {
        name: 'Stickler',
        description:
          'Live-stream analytics dashboard tracking TikTok and Shopee live-stream data for actionable insights.',
      },
      {
        name: 'PiHR',
        description:
          'HRM product built with React.js and RTK Query on a micro-frontend architecture.',
      },
      {
        name: 'VIVAKITS',
        description: 'React component library published on npm.',
        url: 'https://www.npmjs.com/package/@vivakits/react-components',
      },
      {
        name: 'Jump Retail',
        description:
          'Admin dashboard for a supply chain management app, built with Next.js and MUI, integrating multiple APIs.',
      },
      {
        name: 'Flashcard',
        description:
          'Blog management software built with React.js and RTK Query, focused on state management and performance.',
      },
    ],
    stack: ['React', 'Next.js', 'TypeScript', 'RTK Query', 'Micro-frontends', 'MUI'],
  },
  {
    company: 'Tikweb Bangladesh',
    url: 'https://tikweb.com/',
    location: 'Aftab Nagar, Dhaka',
    positions: [{ title: 'Software Engineer', start: '2023-03', end: '2024-04' }],
    bullets: [
      'Developed and maintained the company web application, focused on the frontend.',
      'Optimized frontend performance in server-side rendered applications.',
      'Built web applications with React.js, SvelteKit and Next.js.',
    ],
    stack: ['React', 'SvelteKit', 'Next.js', 'TypeScript', 'SSR'],
  },
  {
    company: 'Soppiya',
    url: 'https://soppiya.com/',
    formerly: ['ConceptX Ltd.', 'SoftX Innovation Ltd.'],
    location: 'Dhaka',
    positions: [
      { title: 'Software Engineer', start: '2022-01', end: '2023-02' },
      { title: 'Junior Software Engineer', start: '2021-05', end: '2021-12' },
      { title: 'Jr. Software Engineer', start: '2020-12', end: '2021-04' },
    ],
    bullets: [
      'Planned, designed and built web application UI systems in React.js.',
      'Created reusable components to keep the UI consistent across the application.',
      'Worked with backend developers and designers to improve usability, and documented technical specs.',
    ],
    stack: ['React', 'JavaScript', 'Component libraries'],
  },
];

export const projects: Project[] = [
  {
    slug: 'drivers-ed',
    title: 'Drivers Ed Platform',
    summary:
      'White-label online driver education LMS for Texas, running as Nexus Drivers Ed and Adi Best Drivers Ed.',
    role: 'Full-Stack',
    type: 'Freelance',
    stack: ['React', 'Next.js', 'TypeScript', 'Laravel'],
    links: [
      { label: 'Nexus Drivers Ed', href: 'https://nexusdriversed.com/' },
      { label: 'Adi Best Drivers Ed', href: 'https://adibestdriversed.com/' },
    ],
    highlights: [
      'Course player with quizzes, final exam and certificate issuance',
      'English and Spanish courses',
      'AI study companion',
      'One codebase, multiple branded tenants',
    ],
    image: {
      light: driversEdLight,
      dark: driversEdDark,
    },
  },
  {
    slug: 'pickclick',
    title: 'PickClick',
    summary: 'AI fashion content platform: ghost mannequin, flat lay and AI on-model visuals.',
    role: 'Full-Stack',
    type: 'Freelance',
    stack: ['Next.js', 'TypeScript', 'NestJS', 'TypeORM', 'MySQL', 'Redis', 'DigitalOcean Spaces'],
    links: [{ label: 'pickclick.io', href: 'https://pickclick.io/' }],
    highlights: [
      'Subscription plans with a credit system',
      'Separate authenticated portal',
      'Media-heavy marketing site served from a CDN',
    ],
    image: {
      light: pickclickLight,
      dark: pickclickDark,
    },
  },
  {
    slug: 'orcasta',
    title: 'Orcasta',
    summary: 'Fashion and lifestyle e-commerce storefront for a Bangladeshi brand.',
    role: 'Frontend',
    type: 'Freelance',
    stack: ['Next.js', 'TypeScript', 'Tailwind', 'SSLCommerz'],
    links: [{ label: 'orcasta.com', href: 'https://orcasta.com/' }],
    highlights: [
      'Category and product catalog, cart, wishlist and profile',
      'Flash sale and events pages',
      'Worldwide shipping flows and SSLCommerz checkout',
    ],
    image: {
      light: orcastaLight,
      dark: orcastaDark,
    },
  },
];

export const skills: SkillGroup[] = [
  {
    group: 'Frontend',
    items: [
      'React',
      'Next.js',
      'TypeScript',
      'JavaScript',
      'Svelte / SvelteKit',
      'Redux Toolkit',
      'RTK Query',
      'Micro-frontends',
      'MUI',
      'TailwindCSS',
      'SASS',
      'Chart.js',
      'Recharts',
    ],
  },
  {
    group: 'Backend',
    items: ['Node.js', 'Express.js', 'NestJS', 'TypeORM', 'Laravel', 'RESTful APIs'],
  },
  { group: 'Data', items: ['PostgreSQL', 'MySQL', 'Redis'] },
  { group: 'DevOps & Tooling', items: ['Git', 'GitHub Actions', 'Docker', 'Bash'] },
  { group: 'Practices', items: ['Testing', 'Performance optimization', 'Responsive design'] },
];

export const services: Service[] = [
  {
    title: 'Web Application Development',
    description:
      'Tailored web apps built for your business needs, with solid functionality and UX.',
    icon: 'app',
  },
  {
    title: 'Frontend Architecture & Component Libraries',
    description: 'Reusable UI components and structure that keep large frontends consistent.',
    icon: 'components',
  },
  {
    title: 'API Development & Integration',
    description: 'Robust REST APIs and integrations that connect your systems cleanly.',
    icon: 'api',
  },
  {
    title: 'Progressive Web Apps',
    description: 'App-like, reliable, installable experiences across devices.',
    icon: 'pwa',
  },
  {
    title: 'Responsive Web Design',
    description: 'Interfaces that adapt and perform on any screen size.',
    icon: 'responsive',
  },
  {
    title: 'Maintenance & Support',
    description: 'Ongoing updates, monitoring and technical help to keep your frontend healthy.',
    icon: 'support',
  },
];

export const education: EducationItem[] = [
  {
    institute: 'American International University - Bangladesh (AIUB)',
    credential: 'BSc in CSE',
    start: 2017,
    end: 2020,
  },
  { institute: 'Mohammadpur Model College', credential: 'HSC', start: 2014, end: 2016 },
  { institute: 'Mohammadpur Govt. High School', credential: 'SSC', start: 2012, end: 2014 },
];

export const contact = {
  heading: "Let's work together",
  blurb: 'Available for commissions and collaborations. Tell me about your project.',
  formAction: 'https://formspree.io/f/xyyrwewl',
} as const;

export const seo = {
  title: 'Md. Estiak Ahmed | Frontend-focused Full-Stack Engineer',
  description:
    'Frontend-focused full-stack engineer in Dhaka, Bangladesh. React, Next.js, TypeScript, NestJS.',
  url: 'https://estiak.me/',
  image: 'https://estiak.me/images/og.jpg', // 1200x630
  twitterCard: 'summary_large_image',
} as const;
