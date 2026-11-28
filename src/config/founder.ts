export interface FounderProject {
  id: string;
  title: string;
  type: string;
  status: "Published" | "Development Project" | "Active";
  description: string;
  techStack: string[];
  packageId?: string;
  liveUrl?: string;
  privacyUrl?: string;
  internalHref?: string;
}

export interface FounderSkillGroup {
  category: string;
  items: string[];
}

export const founderProfile = {
  name: "Vinkal Prajapati",
  brandTagline: "Vinkal Prajapati — Developer, Educator & Technology Entrepreneur.",
  heroHeading: "Building Technology That Solves Real Problems.",
  heroSubheading:
    "Software Developer, Android Engineer & Technology Entrepreneur. I build applications, digital products and scalable software solutions focused on education, productivity and meaningful innovation.",
  positioning:
    "Building meaningful software, mobile applications and technology-driven solutions that solve real-world problems.",
  titles: [
    "Software Developer",
    "Android Developer",
    "Full-Stack Developer",
    "Technology Educator",
    "Founder & Independent Product Builder",
  ],
  bioParagraphs: [
    "I am Vinkal Prajapati, an independent software developer, Android engineer, educator, and founder of SBCI Computer Institute.",
    "My work spans Android application development in Kotlin and Jetpack Compose, modern full-stack web platforms with React and Next.js, multi-tenant SaaS architecture, and cloud-backed educational systems using Firebase and Firestore.",
    "Running SBCI Computer Institute gives me direct insight into real-world institutional operations, student workflows, fee administration, and digital skills training—which directly shapes practical products like CertiDesk Pro, SchoolStudy, Study One, Finance Friend, and Vin Quiz.",
    "My long-term vision is to build reliable, user-centric software products that advance education, personal productivity, and digital transformation.",
  ],
  email: "vinkal93041@gmail.com",
  links: {
    website: "https://vinkal93.github.io",
    github: "https://github.com/vinkal041",
    hashnode: "https://vinkal041.hashnode.dev",
    sbci: "https://sbci.online",
    schoolStudy: "https://school.sbci.online",
    certidesk: "https://certidesk.sbci.online",
  },
  sameAs: [
    "https://github.com/vinkal041",
    "https://vinkal041.hashnode.dev",
    "https://vinkal93.github.io",
    "https://sbci.online",
    "https://school.sbci.online",
    "https://certidesk.sbci.online",
  ],
  seoKeywords: [
    "Vinkal Prajapati",
    "Vinkal Prajapati Developer",
    "Vinkal Prajapati Android Developer",
    "Vinkal Prajapati Software Engineer",
    "Vinkal Prajapati Kotlin Developer",
    "Vinkal Prajapati Founder",
    "SBCI Computer Institute",
    "CertiDesk Pro Founder",
  ],
  skillGroups: [
    {
      category: "Mobile",
      items: ["Kotlin", "Android Development", "Jetpack Compose", "Firebase"],
    },
    {
      category: "Frontend",
      items: ["React.js", "Next.js", "JavaScript", "HTML5", "CSS3", "PWA"],
    },
    {
      category: "Backend",
      items: [
        "Node.js",
        "Express.js",
        "Firebase",
        "Firestore",
        "Supabase",
        "MongoDB",
        "REST APIs",
      ],
    },
    {
      category: "Architecture & Product",
      items: [
        "SaaS Development",
        "Multi-Tenant Architecture",
        "UI/UX",
        "AI Integration",
        "Cloud Technologies",
        "Product Development",
      ],
    },
  ] satisfies FounderSkillGroup[],
  projects: [
    {
      id: "study-one",
      title: "Study One",
      type: "Android Application",
      status: "Published",
      description:
        "Educational productivity application for organizing notes, tasks, exams and job-related information.",
      techStack: ["Kotlin", "Android", "Firebase"],
      packageId: "io.studyone.app",
    },
    {
      id: "finance-friend",
      title: "Finance Friend",
      type: "Android Application",
      status: "Published",
      description:
        "Personal income and expense management application designed to help users organize their finances.",
      techStack: ["Kotlin", "Android", "Local & Cloud Storage"],
      privacyUrl: "https://vinkal93.github.io/FinanceFriend-Privacy-policy/",
    },
    {
      id: "vin-quiz",
      title: "Vin Quiz",
      type: "Android Educational Application",
      status: "Development Project",
      description:
        "Interactive learning and quiz platform for CCC, O Level, SSC and other examinations, with an AI Tutor concept.",
      techStack: ["Kotlin", "Jetpack Compose", "AI Tutor Concept"],
    },
    {
      id: "schoolstudy",
      title: "SchoolStudy",
      type: "Multi-Tenant Education SaaS",
      status: "Development Project",
      description:
        "School management and communication platform with student administration and WhatsApp Business integration concepts.",
      techStack: ["React", "Next.js", "Firebase", "Firestore"],
      liveUrl: "https://school.sbci.online",
    },
    {
      id: "certidesk-pro",
      title: "CertiDesk Pro",
      type: "Institute & Certificate Management SaaS",
      status: "Active",
      description:
        "Multi-institute platform for student records, certificate management, institute verification, institute registration, super administration and institutional workflows.",
      techStack: ["Next.js", "TypeScript", "Firebase", "Firestore", "Razorpay"],
      liveUrl: "https://certidesk.sbci.online",
      internalHref: "/",
    },
    {
      id: "sbci-ecosystem",
      title: "SBCI Digital Ecosystem",
      type: "Education Technology / Business Project",
      status: "Active",
      description:
        "Digital systems and software solutions supporting computer education, student management, fee administration and institutional operations.",
      techStack: ["Web Platforms", "Institute Operations", "EdTech Systems"],
      liveUrl: "https://sbci.online",
    },
  ] satisfies FounderProject[],
  experience: {
    organization: "SBCI Computer Institute",
    role: "Founder / Operator",
    website: "https://sbci.online",
    focusAreas: [
      "Computer education & digital skills training",
      "Student management & batch administration",
      "Fee administration & institutional operations",
      "Software-based administrative improvements & EdTech",
    ],
    trainingDomains: [
      "CCC",
      "ADCA",
      "DCA",
      "O Level",
      "MS Office",
      "Advanced Excel",
      "Tally / GST",
      "Python",
      "Web Development",
      "Computer Fundamentals",
    ],
  },
  writingTopics: [
    "Android Development",
    "Kotlin",
    "Web Development",
    "Firebase",
    "Software Engineering",
    "SaaS Architecture",
    "AI in Education",
    "Practical Technology Tutorials",
  ],
} as const;
