import React, { useState } from 'react';
import { DollarSign, FileText, Plus, Paperclip, CheckCircle2, Clock } from 'lucide-react';

interface Expense {
    id: string;
    description: string;
    date: string;
    amount: number;
    status: 'Approved' | 'Pending' | 'Reimbursed';
    category: string;
}

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([
      { id: '1', description: 'Client Lunch', date: '2024-07-10', amount: 45.50, status: 'Approved', category: 'Meals' },
      { id: '2', description: 'Software License (Figma)', date: '2024-07-01', amount: 15.00, status: 'Reimbursed', category: 'Software' },
      { id: '3', description: 'Uber to Airport', date: '2024-07-15', amount: 32.25, status: 'Pending', category: 'Travel' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: 'Meals', date: '' });

  const handleSubmit = () => {
      if (!form.description || !form.amount) return;
      const newExpense: Expense = {
          id: Date.now().toString(),
          description: form.description,
          amount: parseFloat(form.amount),
          category: form.category,
          date: form.date || new Date().toISOString().split('T')[0],
          status: 'Pending'
      };
      setExpenses([newExpense, ...expenses]);
      setIsModalOpen(false);
      setForm({ description: '', amount: '', category: 'Meals', date: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">My Expenses</h1>
          <p className="text-text-muted-light dark:text-text-muted-dark">Track and submit reimbursement claims.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} /> New Claim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-6 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
               <p className="text-xs font-medium text-text-muted-light uppercase">Pending Approval</p>
               <h3 className="text-2xl font-bold text-text-light dark:text-text-dark mt-1">$32.25</h3>
           </div>
           <div className="p-6 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
               <p className="text-xs font-medium text-text-muted-light uppercase">Reimbursed (YTD)</p>
               <h3 className="text-2xl font-bold text-accent-green mt-1">$1,240.00</h3>
           </div>
      </div>

      <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border-light dark:border-border-dark">
              <h2 className="text-lg font-bold text-text-light dark:text-text-dark">Claim History</h2>
          </div>
          <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-text-muted-light font-semibold">
                  <tr>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-6 py-4 font-medium text-text-light dark:text-text-dark">{exp.description}</td>
                          <td className="px-6 py-4 text-text-muted-light">{exp.category}</td>
                          <td className="px-6 py-4 text-text-muted-light">{exp.date}</td>
                          <td className="px-6 py-4 font-bold text-text-light dark:text-text-dark">${exp.amount.toFixed(2)}</td>
                          <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  exp.status === 'Reimbursed' ? 'bg-green-50 text-green-700 border-green-200' :
                                  exp.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                  'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                  {exp.status === 'Reimbursed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                  {exp.status}
                              </span>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-md">
                <div className="p-6 space-y-4">
                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark mb-4">Submit Expense</h3>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Description</label>
                        <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Amount ($)</label>
                            <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Date</label>
                            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Category</label>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm">
                            <option>Meals</option>
                            <option>Travel</option>
                            <option>Software</option>
                            <option>Office Supplies</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted-light border border-dashed border-border-light dark:border-border-dark p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <Paperclip size={16} />
                        <span>Attach Receipt (Optional)</span>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-text-muted-light">Cancel</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg">Submit</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};