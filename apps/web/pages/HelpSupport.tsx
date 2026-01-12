import React, { useState } from 'react';
import { Search, HelpCircle, MessageSquare, FileText, ExternalLink, ChevronDown, ChevronUp, Mail, BookOpen, Video } from 'lucide-react';

export const HelpSupport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "You can reset your password by going to the Settings page > Security tab. If you cannot log in, use the 'Forgot Password' link on the login screen to receive a reset link via email."
    },
    {
      question: "Where can I find my pay stubs?",
      answer: "Pay stubs are located in the Documents section under the 'Finance' category. You can view and download PDFs of your monthly statements there."
    },
    {
      question: "How do I request time off?",
      answer: "Navigate to your Dashboard or Profile. Click on the 'Request Leave' button. Select your dates and leave type, then submit for manager approval."
    },
    {
      question: "Can I edit my personal information?",
      answer: "Yes, you can edit your profile information (phone, address, emergency contacts) in the Employee Detail page by clicking 'Edit Profile' or via the Settings page."
    },
    {
        question: "How do I assign a training module to a team member?",
        answer: "Go to the Employee Directory, select the employee, navigate to the 'Training' tab, and click 'Assign Module'. Select the course from the catalog."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Hero / Search Section */}
      <div className="bg-primary-dark rounded-2xl p-8 md:p-12 text-center text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">How can we help you?</h1>
        <p className="text-blue-100 mb-8 max-w-2xl mx-auto relative z-10">Search our knowledge base for answers to common questions, tutorials, and policy documents.</p>
        
        <div className="relative max-w-xl mx-auto z-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
                type="text" 
                placeholder="Search for articles, guides, or questions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-800 shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/30 transition-shadow"
            />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQs */}
        <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                <HelpCircle className="text-primary" /> 
                Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
                {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq, index) => (
                        <div 
                            key={index} 
                            className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl overflow-hidden transition-all shadow-sm"
                        >
                            <button 
                                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                            >
                                <span className="font-semibold text-text-light dark:text-text-dark">{faq.question}</span>
                                {openFaqIndex === index ? (
                                    <ChevronUp className="text-primary transition-transform" size={20} />
                                ) : (
                                    <ChevronDown className="text-text-muted-light transition-transform" size={20} />
                                )}
                            </button>
                            {openFaqIndex === index && (
                                <div className="px-5 pb-5 text-text-muted-light dark:text-text-muted-dark text-sm leading-relaxed animate-in slide-in-from-top-2 duration-200">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark">
                        <p className="text-text-muted-light">No results found for "{searchTerm}".</p>
                    </div>
                )}
            </div>
        </div>

        {/* Sidebar: Quick Links & Contact */}
        <div className="space-y-6">
             {/* Quick Links */}
             <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                <h3 className="font-bold text-text-light dark:text-text-dark mb-4">Resources</h3>
                <div className="space-y-3">
                    <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40">
                            <BookOpen size={18} />
                        </div>
                        <div>
                            <p className="font-medium text-sm text-text-light dark:text-text-dark">User Guide</p>
                            <p className="text-xs text-text-muted-light">Complete platform documentation</p>
                        </div>
                    </a>
                    <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40">
                            <Video size={18} />
                        </div>
                        <div>
                            <p className="font-medium text-sm text-text-light dark:text-text-dark">Video Tutorials</p>
                            <p className="text-xs text-text-muted-light">Step-by-step walkthroughs</p>
                        </div>
                    </a>
                     <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-background-light dark:hover:bg-background-dark transition-colors group">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/40">
                            <ExternalLink size={18} />
                        </div>
                        <div>
                            <p className="font-medium text-sm text-text-light dark:text-text-dark">HR Portal</p>
                            <p className="text-xs text-text-muted-light">External company resources</p>
                        </div>
                    </a>
                </div>
            </div>

            {/* Contact Support */}
            <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                 <h3 className="font-bold text-text-light dark:text-text-dark mb-4">Still need help?</h3>
                 <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">Our support team is available Mon-Fri, 9am - 5pm EST.</p>
                 
                 <form className="space-y-3">
                    <input 
                        type="text" 
                        placeholder="Subject"
                        className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                    />
                    <textarea 
                        rows={3}
                        placeholder="Describe your issue..."
                        className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                    />
                    <button className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-white font-medium rounded-lg text-sm hover:bg-primary/90 transition-colors">
                        <Mail size={16} />
                        Send Message
                    </button>
                 </form>
            </div>
        </div>
      </div>
    </div>
  );
};
