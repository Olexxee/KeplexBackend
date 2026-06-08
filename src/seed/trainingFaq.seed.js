import { prisma } from "../config/prisma.js";

const DEFAULT_CONFIGS = [
  {
    key: "importation_settings",
    value: {
      enabled: true,
      showOnLandingPage: true,
      showInStore: true,
      landingTitle: "Import Quality Products From China",
      landingDescription:
        "Learn how to source profitable products directly from trusted suppliers and grow your business.",
    },
  },

  {
    key: "pricing_rules",
    value: {
      globalDiscount: 0,

      trainingPromo: {
        active: false,
        percent: 0,
        bannerText: "",
      },
    },
  },

  {
    key: "store_settings",
    value: {
      showImportedCategory: true,
      featuredCategories: [],
    },
  },

  {
    key: "training_programs",
    value: {
      featured: [],
    },
  },

  {
    key: "training_faq",
    value: {
      items: [
        {
          question: "Do I need prior experience before joining?",
          answer:
            "No. All our training programs are beginner-friendly and designed to guide you step-by-step.",
        },

        {
          question: "Will I receive mentorship after training?",
          answer:
            "Yes. Students receive continued guidance, support, and access to our learning community.",
        },

        {
          question: "Can I start a business after completing the training?",
          answer:
            "Yes. Our trainings focus on practical skills that can be turned into profitable businesses.",
        },

        {
          question: "Will materials be provided?",
          answer:
            "Material requirements vary by program. Details are shared before training begins.",
        },

        {
          question: "How do I secure my registration slot?",
          answer:
            "Your slot becomes reserved once your registration payment is successfully completed.",
        },

        {
          question: "Are online classes available?",
          answer:
            "Some programs are available online while others may be physical or hybrid depending on the schedule.",
        },

        {
          question: "Can I register for more than one program?",
          answer:
            "Yes. You may enroll in multiple training programs if you meet the requirements and available schedules.",
        },

        {
          question: "Will I receive a certificate?",
          answer:
            "Certificate availability depends on the specific training program.",
        },
      ],
    },
  },

  {
    key: "landing_page_content",
    value: {
      heroBadge: "1300+ Students Trained",

      heroTitle: "Learn Skills. Build Products. Create Income.",

      heroDescription:
        "Master resin craft, lipcare formulation, product sourcing and business development through practical training and mentorship.",

      aboutTitle:
        "Teaching Skills. Building Confidence. Creating Opportunities.",

      aboutDescription:
        "Keplex Academy helps aspiring entrepreneurs learn practical skills, launch products, and build sustainable businesses.",

      ctaTitle: "Ready To Start Building Your Own Business?",

      ctaDescription:
        "Join hundreds of students already creating products, serving customers and generating income.",
    },
  },
];

export const seedBusinessConfigs = async () => {
  for (const config of DEFAULT_CONFIGS) {
    await prisma.businessConfig.upsert({
      where: {
        key: config.key,
      },

      update: {
        value: config.value,
      },

      create: config,
    });
  }

  console.log("✅ Business configs seeded");
};
