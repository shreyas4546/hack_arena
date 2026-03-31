export interface ProblemStatement {
  title: string;
  problem: string;
  description: string;
  objectives: string[];
  features: string[];
  outcome: string;
}

export const problemStatements: Record<string, ProblemStatement[]> = {
  "Social Impact": [
    {
      title: "Surplus Food Rescue & Redistribution Network",
      problem: "Tons of edible food from events, college fests, and restaurants go to waste daily, while local shelters and underprivileged communities struggle with food insecurity.",
      description: "A real-time, geolocation-based web or mobile application connecting surplus food donors (caterers, event organizers) directly with verified NGOs and volunteer delivery fleets to rescue food before it spoils.",
      objectives: [
        "Minimize urban food waste",
        "Bridge the local hunger gap",
        "Optimize logistics for rapid food pickup"
      ],
      features: [
        "Real-time donor alerts",
        "Volunteer driver tracking",
        "Food safety guidelines checklist",
        "Expiration countdown timers",
        "Community impact dashboard (e.g., \"Meals Saved\")"
      ],
      outcome: "A sustainable, rapid-response logistics platform that turns food waste into a community resource."
    },
    {
      title: "Community Time-Banking & Skill Exchange",
      problem: "Low-income individuals or students often lack the funds to pay for essential services (tutoring, basic repairs, design work) but possess valuable skills of their own that go unutilized.",
      description: "A localized \"time-banking\" system where users trade services using \"time credits\" (hours) instead of fiat currency. For example, a CS student builds a website for a local tailor, earning credits to spend on getting clothes stitched.",
      objectives: [
        "Foster community self-reliance",
        "Remove financial barriers to essential services",
        "Build local trust"
      ],
      features: [
        "AI-driven skill-matching algorithm",
        "Escrow-based \"time-credit\" digital wallet",
        "Robust user verification",
        "Rating systems",
        "Localized community request boards"
      ],
      outcome: "An inclusive, alternative economy platform that empowers communities to support each other equitably."
    }
  ],
  "Healthcare": [
    {
      title: "AI-Powered Mental Wellness & Trigger Mapping",
      problem: "Students and young professionals struggling with anxiety or stress often cannot pinpoint their hidden environmental, academic, or digital triggers.",
      description: "A privacy-first application that logs daily activities, screen time, and moods. It utilizes data logic to identify hidden patterns and predict potential mental health dips before they happen.",
      objectives: [
        "Promote proactive mental healthcare",
        "Identify hidden daily stressors",
        "Provide timely coping mechanisms"
      ],
      features: [
        "Interactive mood journaling interface",
        "Digital habit tracking",
        "Logic-based pattern recognition",
        "SOS/therapist alert button",
        "Daily personalized wellness nudges"
      ],
      outcome: "A proactive, intelligent mental health companion that helps users map their triggers and maintain emotional stability."
    },
    {
      title: "Virtual Post-Op Rehabilitation & Adherence Tracker",
      problem: "Patients often neglect physical therapy and post-operative care instructions once discharged, leading to prolonged recovery times or medical complications.",
      description: "An interactive ecosystem where doctors prescribe specific daily exercise routines and medication schedules, and patients log their daily progress from home.",
      objectives: [
        "Improve patient adherence to recovery plans",
        "Reduce hospital readmissions",
        "Enable remote doctor supervision"
      ],
      features: [
        "Gamified daily task lists (exercises, meds)",
        "Video-guided physical therapy routines",
        "Daily pain-scale logging",
        "Automated alerts sent to doctors if a patient misses critical milestones"
      ],
      outcome: "A supportive recovery platform that bridges the gap between hospital discharge and full physical rehabilitation."
    }
  ],
  "FinTech": [
    {
      title: "Student Micro-Wealth & Financial Sandbox",
      problem: "College students often graduate with poor financial literacy and miss out on the power of early compounding wealth due to a lack of investable capital and market fear.",
      description: "A platform that tracks daily campus purchases, rounds up the \"spare change\" digitally, and simulates investing it in real-world stocks, paired with bite-sized financial literacy modules.",
      objectives: [
        "Cultivate early saving habits",
        "Demystify the stock market safely",
        "Promote long-term financial independence"
      ],
      features: [
        "Expense round-up simulator",
        "Virtual stock portfolio with live market API data",
        "Gamified financial literacy quizzes",
        "Peer-to-peer savings challenges"
      ],
      outcome: "An educational FinTech tool that transforms everyday student spending into a hands-on, risk-free lesson in wealth building."
    },
    {
      title: "Trust-Bound Freelance Escrow & Invoicing",
      problem: "Student freelancers and independent gig workers constantly face delayed payments, scope creep, or clients defaulting on payments after the work is delivered.",
      description: "A smart-contract-inspired platform where clients deposit funds into a milestone-based digital escrow before the work begins. Funds are released automatically upon mutual approval of project milestones.",
      objectives: [
        "Guarantee secure payments for gig workers",
        "Establish transparent project scopes",
        "Eliminate the hassle of chasing invoices"
      ],
      features: [
        "Milestone breakdown generator",
        "Digital contract signing",
        "Integrated dispute resolution chat",
        "Automated invoice generation",
        "Simulated escrow wallet system"
      ],
      outcome: "A highly secure financial bridge that protects young freelancers from exploitation and builds absolute trust with clients."
    }
  ],
  "EdTech": [
    {
      title: "Cross-Disciplinary Project Incubator & Matchmaker",
      problem: "Students usually build isolated projects strictly within their own branches (e.g., CS students building apps without a business model; management students creating business plans without a product).",
      description: "A platform that intelligently matches students across different departments (Engineering, Design, Business) to collaborate on comprehensive, startup-ready projects.",
      objectives: [
        "Simulate real-world industry environments",
        "Break academic silos",
        "Foster entrepreneurial thinking"
      ],
      features: [
        "Skills/interest profiling",
        "AI-based team matching (pairing complementary skills)",
        "Unified project workspace",
        "Milestone tracking",
        "Built-in pitch-deck generator"
      ],
      outcome: "A collaborative hub that transforms basic academic assignments into viable, cross-functional startup prototypes."
    },
    {
      title: "Interactive Algorithm Visualization Battleground",
      problem: "Abstract computer science concepts (like sorting algorithms, graph traversals, or dynamic programming) are notoriously difficult for beginners to grasp through static textbooks.",
      description: "A visually immersive platform where students write code to control visual elements on screen. It turns algorithm execution into a visible, step-by-step animation or a competitive multiplayer game.",
      objectives: [
        "Enhance the comprehension of complex data structures",
        "Make learning visually rewarding",
        "Encourage competitive code optimization"
      ],
      features: [
        "Real-time code-to-animation engine",
        "Step-by-step execution debugger",
        "Time/space complexity analyzer",
        "Multiplayer \"code golf\" arenas to solve logic puzzles visually"
      ],
      outcome: "An engaging, visual learning tool that demystifies hard computer science concepts through interactive visualization."
    }
  ],
  "Campus Solutions": [
    {
      title: "Unified Campus Event & Extracurricular Hub",
      problem: "Extracurricular activities, club events, and workshops are often poorly marketed across fragmented WhatsApp groups, leading to low student engagement. Furthermore, students lack a verified, centralized way to showcase their non-academic participation and soft skills to future employers.",
      description: "A centralized event discovery platform that gamifies campus life. Students earn verified digital badges and \"Campus Points\" for attending workshops, organizing events, or volunteering, which automatically compile into a verified extracurricular resume.",
      objectives: [
        "Boost student engagement in campus activities",
        "Centralize event marketing and ticketing for student clubs",
        "Provide verified proof of extracurricular achievements for placements"
      ],
      features: [
        "Dynamic event discovery feed with category filters",
        "QR-code based attendance tracking and ticketing",
        "Digital badge system for verified skill acquisition",
        "Automated extracurricular resume generator",
        "Club management and analytics dashboard for organizers"
      ],
      outcome: "A dynamic platform that incentivizes campus involvement and seamlessly translates student participation into tangible career assets."
    },
    {
      title: "Campus Nexus: Peer Marketplace & Recovery",
      problem: "Students lack a safe, localized network to buy/sell used academic materials (textbooks, drafters, electronics) or efficiently recover lost items scattered across a large campus.",
      description: "An exclusive, verified-student-only platform combining a hyperlocal thrift marketplace with an intelligent lost-and-found registry.",
      objectives: [
        "Promote a circular campus economy",
        "Significantly reduce student expenses on supplies",
        "Rapidly reunite students with lost belongings"
      ],
      features: [
        "College ID (email) verification barrier",
        "Image-based item listing (sell/donate)",
        "Image tagging for lost & found",
        "Integrated secure campus meetup scheduler (e.g., \"Meet at the library at 2 PM\")"
      ],
      outcome: "A secure, sustainable micro-economy and community support network exclusive to the Jain College of Engineering ecosystem."
    }
  ]
};

export const domains = Object.keys(problemStatements);
