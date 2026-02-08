'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What are quiet hours?',
    answer: 'Courtesy hours are 24/7, meaning you should always be mindful of noise. Official quiet hours are Sunday–Thursday 10 PM – 8 AM, and Friday–Saturday midnight – 10 AM. During finals week quiet hours are 24 hours a day.',
  },
  {
    question: 'How do I submit a maintenance request?',
    answer: 'Log in to the UGA Housing portal at housing.uga.edu and navigate to "Maintenance Request." You can also call your front desk to report emergencies like flooding or no A/C.',
  },
  {
    question: 'What is the guest/visitor policy?',
    answer: 'Residents can have guests visit, but overnight guests must be registered through the front desk. Guests can stay a maximum of 3 consecutive nights and no more than 6 nights per month. Your roommate must agree to any overnight guest.',
  },
  {
    question: 'Can I have a car on campus as a freshman?',
    answer: 'Freshmen living on campus can purchase a parking permit, but spaces are limited. Most freshmen find the UGA bus system sufficient. Parking permits are sold through UGA Transportation & Parking Services at parking.uga.edu.',
  },
  {
    question: 'What happens if I get locked out?',
    answer: 'Visit your community front desk with your UGA BulldawgCard for a temporary key/access. There may be a lockout fee after multiple occurrences. Front desks are open 24/7.',
  },
  {
    question: 'How do I change rooms or request a roommate change?',
    answer: 'Contact UGA Housing at (706) 542-1421 or visit housing.uga.edu to start the room change process. Changes are handled on a case-by-case basis and usually open after the first two weeks of the semester.',
  },
  {
    question: 'What appliances can I have in my room?',
    answer: 'You can have a micro-fridge (combined microwave/fridge unit), coffee maker, and small fan. Prohibited items include hot plates, toasters, open-coil appliances, candles, and space heaters. Check the UGA Housing Handbook for the full list.',
  },
  {
    question: 'Where do I do laundry?',
    answer: 'Every residence hall has a laundry room with washers and dryers free for residents. You can check machine availability via the CSC ServiceWorks app.',
  },
  {
    question: 'What should I do in an emergency?',
    answer: 'For life-threatening emergencies, call 911. For non-emergency campus safety issues, call UGA Police at (706) 542-2200. For housing emergencies (flooding, fire alarm, etc.), call your front desk or 911.',
  },
  {
    question: 'Where can I get food on campus?',
    answer: 'UGA has five dining halls: Bolton, Snelling, Oglethorpe, Village Summit, and Niche (ECV). Your meal plan works at all locations. You can also use Bulldog Bucks at campus restaurants and vending machines.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-3 sm:py-4 flex items-center gap-2">
        <HelpCircle className="w-5 h-5" />
        <h3 className="font-bold text-base sm:text-lg">Frequently Asked Questions</h3>
      </div>

      {/* Questions */}
      <div className="divide-y divide-gray-100">
        {FAQ_ITEMS.map((item, idx) => (
          <div key={idx}>
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 sm:py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-all"
            >
              <span className="text-sm font-medium text-gray-900">{item.question}</span>
              {openIndex === idx ? (
                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
            </button>
            {openIndex === idx && (
              <div className="px-4 pb-3">
                <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQSection;
