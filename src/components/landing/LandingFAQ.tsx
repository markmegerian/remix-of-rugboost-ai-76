import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How accurate is the AI analysis?',
    answer: 'Our AI has been trained on thousands of rug images and achieves over 95% accuracy in identifying rug types, origins, and common condition issues. For edge cases, you can always make manual adjustments.',
  },
  {
    question: 'Can I customize the pricing for my services?',
    answer: 'Absolutely. You can set custom prices per square foot for each service, create pricing tiers based on rug type, and even set minimum charges. The AI uses your pricing to generate estimates automatically.',
  },
  {
    question: 'How does the client portal work?',
    answer: 'When you are ready, you can invite clients via email. They receive a secure link to view their rug inspections, approve estimates, make payments, and track job progress. No app download required.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use bank-level encryption for all data. Your client information and business data are stored securely and never shared with third parties. We are SOC 2 Type II compliant.',
  },
  {
    question: 'Can I integrate RugBoost with my existing software?',
    answer: 'Pro and Enterprise plans include API access for custom integrations. We also offer pre-built integrations with popular accounting and CRM software. Contact us for specific integration needs.',
  },
  {
    question: 'What happens after the free trial?',
    answer: 'After 14 days, you can choose to subscribe to a paid plan. If you do not subscribe, your account will be read-only. You can export your data at any time. We do not auto-charge.',
  },
  {
    question: 'Do you offer training?',
    answer: 'All plans include self-serve documentation and video tutorials. Pro plans get priority support with screen-sharing assistance. Enterprise plans include dedicated onboarding and custom training sessions.',
  },
];

export default function LandingFAQ() {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Have questions? We have got answers.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card rounded-xl border border-border px-6 shadow-card"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
